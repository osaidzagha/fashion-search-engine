import { Request, Response } from "express";
import { ProductModel } from "../models/Product";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 20;
    const limit = Math.min(requestedLimit, 50);
    const skip = (page - 1) * limit;
    let filter: any = {};

    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" }; // Case-insensitive search on name
    }
    if (req.query.maxPrice) {
      const max = Number(req.query.maxPrice);
      filter.price = { $lte: max };
    }
    const allProducts = await ProductModel.find(filter)
      .skip(skip)
      .limit(limit)
      .exec();
    return res.status(200).json(allProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    // If something breaks, we send a 500 (Internal Server Error) back to the frontend
    res.status(500).json({ message: "Server Error fetching products" });
  }
};
