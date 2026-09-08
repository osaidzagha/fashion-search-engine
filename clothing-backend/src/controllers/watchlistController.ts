// src/controllers/watchlistController.ts
import { Response } from "express";
import { UserModel } from "../models/User";
import { ProductModel } from "../models/Product";
import { priceAlertQueue } from "../queues/queues";
import { AuthRequest } from "../middlewares/authMiddleware";
import { RowDataPacket } from "mysql2/typings/mysql/lib/protocol/packets/RowDataPacket";
import { pool } from "../db";
// GET /api/watchlist
export const getWatchlist = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
   p.product_id AS id,p.product_name AS name,p.product_price AS price,p.currency,p.product_link AS link,
   p.available,b.brand_name AS brand,w.tracked_price AS trackedPrice,w.target_price AS targetPrice,w.added_at AS addedAt,
   MIN(i.image_url) AS image
FROM watchlists w
JOIN products p ON w.product_id = p.product_id
JOIN brands b ON p.brand_id = b.brand_id
LEFT JOIN images i ON p.product_id = i.product_id
WHERE w.user_id = ?
GROUP BY p.product_id, w.watchlist_id`,
      [req.user!.user_id], // fills the ? in WHERE w.user_id = ?
    );

    if (rows.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
// POST /api/watchlist/:productId
export const addToWatchlist = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const userId = req.user!.user_id;
    const productId = req.params["productId"];
    const [productRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE product_id = ?",
      [req.params["productId"]],
    );
    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    await pool.query(
      "INSERT INTO watchlists (user_id, product_id, tracked_price, target_price) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE target_price = VALUES(target_price)",
      [
        req.user!.user_id,
        req.params["productId"],
        product.product_price,
        req.body.targetPrice,
      ],
    );
    return res.status(201).json({ message: "Added to watchlist" });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
// DELETE /api/watchlist/:productId
export const removeFromWatchlist = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const productId = req.params["productId"] as string;
    const userId = req.user!.user_id;
    await pool.query(
      "DELETE FROM watchlists WHERE user_id = ? AND product_id = ?",
      [userId, productId],
    );
    return res.status(200).json({ message: "Removed from watchlist" });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const notifyWatchlistUsers = async (
  productId: string,
  productName: string,
  productLink: string,
  oldPrice: number,
  newPrice: number,
  currency: string,
  brandName: string,
  runId: string,
): Promise<void> => {
  try {
    const users = await UserModel.find({
      "watchlist.productId": productId,
    }).lean();

    if (users.length === 0) return;

    console.log(
      `📧 Prepping price drop alerts for ${users.length} users on ${productName}`,
    );

    const jobs = users.map((user) => ({
      name: "price-alert",
      data: {
        email: user.email,
        productName,
        productLink,
        oldPrice,
        newPrice,
        currency,
        brandName,
        runId,
      },
    }));

    const BATCH_SIZE = 1000;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      await priceAlertQueue.addBulk(batch);
      console.log(`✅ Queued batch of ${batch.length} emails...`);
    }
  } catch (error) {
    console.error("Error queueing watchlist notifications:", error);
  }
};
