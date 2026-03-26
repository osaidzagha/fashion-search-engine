import { Request, Response } from "express";
import { ProductModel } from "../models/Product";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 20;
    const limit = Math.min(requestedLimit, 50);
    const skip = (page - 1) * limit;

    let filter: any = {};
    let sortOption: any = {};

    if (req.query.sort === "lowest") {
      sortOption.price = 1; // Ascending price
    } else if (req.query.sort === "highest") {
      sortOption.price = -1; // Descending price
    }
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" }; // Case-insensitive search on name
    }
    if (req.query.maxPrice) {
      const max = Number(req.query.maxPrice);
      filter.price = { $lte: max };
    }
    if (req.query.brand) {
      const brandArray = (req.query.brand as string)
        .split(",")
        .map((brand) => brand.trim());
      filter.brand = { $in: brandArray };
    }
    if (req.query.category) {
      const categoryArray = (req.query.category as string)
        .split(",")
        .map((cat) => cat.trim().toUpperCase());
      filter.category = { $in: categoryArray };
    }

    const [allProducts, total] = await Promise.all([
      ProductModel.find(filter).sort(sortOption).skip(skip).limit(limit),
      ProductModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      products: allProducts,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    // If something breaks, we send a 500 (Internal Server Error) back to the frontend
    res.status(500).json({ message: "Server Error fetching products" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    // 1. Grab the ID from the URL path
    const productId = req.params.id;

    // 2. Ask MongoDB to find one specific item by its id
    const product = await ProductModel.findOne({ id: productId });

    // 3. The 404 Check (Defensive Programming)
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 4. Success! Send the single object back
    return res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching single product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
