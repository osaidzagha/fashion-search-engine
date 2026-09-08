import { Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// ─── GET /api/products ────────────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const conditions: string[] = ["p.available = 1"];
    const params: any[] = [];

    if (req.query.brand) {
      conditions.push("b.brand_name = ?");
      params.push(req.query.brand);
    }

    if (req.query.maxPrice) {
      conditions.push("p.product_price <= ?");
      params.push(Number(req.query.maxPrice));
    }

    if (req.query.departments) {
      conditions.push("d.department_name = ?");
      params.push(req.query.departments);
    }

    if (req.query.onSale === "true") {
      conditions.push("p.original_price > p.product_price");
    }

    const WHERE = conditions.join(" AND ");
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT p.product_id) AS total
   FROM products p
   JOIN brands b ON p.brand_id = b.brand_id
   JOIN departments d ON p.department_id = d.department_id
   WHERE ${WHERE}`,
      [...params],
    );
    const total = Number(countRows[0]?.total || 0);

    const [productRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.product_id AS id, p.brand_ext_id, p.product_name AS name, p.product_price AS price, p.original_price AS originalPrice,p.currency,
       p.product_link AS link, p.product_color AS color, p.available, b.brand_name AS brand, d.department_name AS department, MIN(i.image_url)
        AS primary_image,JSON_ARRAYAGG(i.image_url) AS images FROM products p JOIN brands b ON p.brand_id = b.brand_id JOIN departments d
         ON p.department_id = d.department_id LEFT JOIN images i ON p.product_id = i.product_id 
         LEFT JOIN sizes s ON p.product_id = s.product_id LEFT JOIN videos v ON p.product_id = v.product_id 
         WHERE ${WHERE} GROUP BY p.product_id ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return res.status(200).json({
      products: productRows,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      availableSizes: [],
      availableColors: [],
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET /api/products/:id ────────────────────────────────────────────────────
export const getProductById = async (req: Request, res: Response) => {
  try {
    const [productRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.product_id AS id,p.product_id,p.brand_ext_id,p.product_name AS name,p.product_price AS price,
p.original_price AS originalPrice,p.currency,p.product_link AS link,p.product_color AS color,p.available,b.brand_name AS brand
FROM products p 
LEFT JOIN brands b ON p.brand_id = b.brand_id 
WHERE p.product_id = ?`,
      [req.params.id],
    );

    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const [imagesRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM images i LEFT JOIN products p ON i.product_id = p.product_id WHERE i.product_id = ?",
      [req.params.id],
    );
    product.images = imagesRows;
    const [videosRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM videos v LEFT JOIN products p ON v.product_id = p.product_id WHERE v.product_id = ?",
      [req.params.id],
    );
    product.videos = videosRows;

    const [priceHistoryRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM price_history LEFT JOIN products p ON price_history.product_id = p.product_id WHERE price_history.product_id = ? ORDER BY price_history.recorded_at ASC",
      [req.params.id],
    );
    product.priceHistory = priceHistoryRows;

    const [sizesRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM sizes s LEFT JOIN products p ON s.product_id = p.product_id WHERE s.product_id = ?",
      [req.params.id],
    );
    product.sizes = sizesRows;
    product.priceHistory = priceHistoryRows.map((r) => ({
      price: Number(r.price_value),
      date: r.recorded_at,
    }));
    product.sizes = sizesRows.map((r) => r.size_label);
    product.images = imagesRows.map((r) => r.image_url);
    return res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── DELETE /api/admin/products/:id ──────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM products WHERE product_id = ?",
      [productId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json({ message: "Product permanently deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET /api/products/featured ──────────────────────────────────────────────
export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const conditions: string[] = ["p.available = 1"];
    const params: any[] = [];
    if (req.query.departments) {
      conditions.push("d.department_name = ?");
      params.push(req.query.departments);
    }
    const WHERE = conditions.join(" AND ");

    const [[onSaleRows], [newInRows], [withVideoRows], [campaignHeroRows]] =
      await Promise.all([
        pool.query<RowDataPacket[]>(
          `SELECT p.product_id AS id, p.brand_ext_id,  p.product_name AS name,  p.product_price AS price,  p.original_price AS originalPrice,
           p.currency,  p.product_link AS link,  p.product_color AS color,  p.available,  b.brand_name AS brand,  d.department_name AS department,  MIN(i.image_url) AS primary_image
        FROM products p JOIN brands b ON p.brand_id = b.brand_id JOIN departments d
        ON p.department_id = d.department_id LEFT JOIN images i ON p.product_id = i.product_id 
        LEFT JOIN sizes s ON p.product_id = s.product_id LEFT JOIN videos v ON p.product_id = v.product_id 
        WHERE ${WHERE} AND p.original_price > p.product_price GROUP BY p.product_id ORDER BY (p.original_price - p.product_price) DESC limit 12`,
          [...params],
        ),
        pool.query<RowDataPacket[]>(
          `SELECT p.product_id, p.brand_ext_id, p.product_name, p.product_price, p.original_price,p.currency,
        p.product_link, p.product_color, p.available, b.brand_name, d.department_name, MIN(i.image_url)
        AS primary_image FROM products p JOIN brands b ON p.brand_id = b.brand_id JOIN departments d
        ON p.department_id = d.department_id LEFT JOIN images i ON p.product_id = i.product_id 
        LEFT JOIN sizes s ON p.product_id = s.product_id LEFT JOIN videos v ON p.product_id = v.product_id 
        WHERE ${WHERE} GROUP BY p.product_id ORDER BY p.created_at DESC limit 15`,
          [...params],
        ),
        pool.query<RowDataPacket[]>(
          `SELECT p.product_id, p.brand_ext_id, p.product_name, p.product_price, p.original_price,p.currency,
        p.product_link, p.product_color, p.available, b.brand_name, d.department_name, MIN(i.image_url)
        AS primary_image FROM products p JOIN brands b ON p.brand_id = b.brand_id JOIN departments d
        ON p.department_id = d.department_id LEFT JOIN images i ON p.product_id = i.product_id 
        LEFT JOIN sizes s ON p.product_id = s.product_id LEFT JOIN videos v ON p.product_id = v.product_id 
        WHERE ${WHERE} AND v.product_id IS NOT NULL
        GROUP BY p.product_id ORDER BY p.created_at DESC limit 20`,
          [...params],
        ),
        pool.query<RowDataPacket[]>(
          `SELECT p.product_id, p.brand_ext_id, p.product_name, p.product_price, p.original_price,p.currency,
        p.product_link, p.product_color, p.available, b.brand_name, d.department_name, MIN(i.image_url)
        AS primary_image FROM products p JOIN brands b ON p.brand_id = b.brand_id JOIN departments d
        ON p.department_id = d.department_id LEFT JOIN images i ON p.product_id = i.product_id 
        LEFT JOIN sizes s ON p.product_id = s.product_id LEFT JOIN videos v ON p.product_id = v.product_id 
        WHERE ${WHERE} AND p.is_campaign_hero = 1
        GROUP BY p.product_id ORDER BY p.created_at DESC limit 30`,
          [...params],
        ),
      ]);
    return res.status(200).json({
      onSale: onSaleRows,
      newIn: newInRows,
      withVideo: withVideoRows,
      campaignHeroes: campaignHeroRows,
      categoryTiles: {},
    });
  } catch (error) {
    console.error("Error fetching featured:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET /api/products/suggestions ───────────────────────────────────────────
export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) return res.status(200).json([]);

    const [suggestionsRows] = await pool.query<RowDataPacket[]>(
      "SELECT DISTINCT product_name FROM products p WHERE product_name LIKE ? AND available = 1 LIMIT 10",
      [`%${q}%`],
    );
    const suggestions = suggestionsRows.map((row) => row.product_name);

    return res.status(200).json(suggestions);
  } catch (error) {
    console.error("Suggestions error:", error);
    res.status(200).json([]);
  }
};

// ─── GET /api/categories ──────────────────────────────────────────────────────
export const getCategories = async (req: Request, res: Response) => {
  try {
    const [categoriesRows] = await pool.query<RowDataPacket[]>(
      "SELECT DISTINCT category_name FROM categories",
    );
    return res.status(200).json(categoriesRows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ─── DELETE /api/products/:id/media ──────────────────────────────────────────
export const deleteProductMedia = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { mediaUrls } = req.body;

    if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      res.status(400).json({ error: "No media URLs provided." });
      return;
    }
    const [productRows] = await pool.query<RowDataPacket[]>(
      "SELECT product_id FROM products WHERE product_id = ?",
      [id],
    );
    const product = productRows[0];
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const deleteProducts = await pool.query<ResultSetHeader>(
      "DELETE FROM images WHERE product_id = ? AND image_url IN (?)",
      [id, mediaUrls],
    );
    const deleteVideos = await pool.query<ResultSetHeader>(
      "DELETE FROM videos WHERE product_id = ? AND video_url IN (?)",
      [id, mediaUrls],
    );

    res.status(200).json({ message: "Media deleted successfully" });
    return;
  } catch (error) {
    console.error("[ProductController] Delete Media Error:", error);
    res.status(500).json({ error: "Failed to delete media." });
  }
};

// ─── GET /api/products/:id/related ───────────────────────────────────────────
export const getRelatedProducts = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const [productRows] = await pool.query<RowDataPacket[]>(
      "SELECT department_id, category_id FROM products WHERE product_id = ?",
      [id],
    );
    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const [relatedRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.product_id AS id, p.brand_ext_id,  p.product_name AS name,  p.product_price AS price,  p.original_price AS originalPrice, p.currency, 
p.product_link AS link, p.product_color AS color, p.available, b.brand_name AS brand, d.department_name AS department, MIN(i.image_url) AS primary_image 
FROM products p  JOIN brands b ON p.brand_id = b.brand_id JOIN departments d ON p.department_id = d.department_id
 LEFT JOIN images i ON p.product_id = i.product_id LEFT JOIN sizes s ON p.product_id = s.product_id LEFT JOIN videos v 
 ON p.product_id = v.product_id WHERE p.department_id = ? AND p.category_id = ? AND p.product_id != ? AND p.available = 1
  GROUP BY p.product_id LIMIT 4`,
      [product.department_id, product.category_id, id],
    );
    const relatedProducts = relatedRows;
    return res.status(200).json(relatedProducts);
  } catch (error) {
    console.error("Error fetching related products:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET /api/products/trending ──────────────────────────────────────────────
export const getTrendingProducts = async (req: Request, res: Response) => {
  try {
    const conditions: string[] = ["p.available = 1"];
    const params: any[] = [];
    if (req.query.departments) {
      conditions.push("d.department_name = ?");
      params.push(req.query.departments);
    }
    const WHERE = conditions.join(" AND ");
    const [resultRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.product_id AS id, p.brand_ext_id, p.product_name AS name, p.product_price AS price, p.original_price AS originalPrice,
  p.currency, p.product_link AS link, p.product_color AS color, p.available, b.brand_name AS brand, d.department_name AS department, MIN(i.image_url) AS primary_image 
  FROM products p JOIN brands b ON p.brand_id = b.brand_id JOIN departments d ON p.department_id = d.department_id LEFT JOIN images i ON p.product_id = i.product_id
  WHERE ${WHERE} GROUP BY p.product_id ORDER BY (p.original_price - p.product_price) DESC, p.updated_at DESC LIMIT 12`,
      [...params],
    );
    const results = resultRows;
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};
