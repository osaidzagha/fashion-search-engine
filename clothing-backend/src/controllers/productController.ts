import { Request, Response } from "express";
import { ProductModel } from "../models/Product";

export const getProducts = async (req: Request, res: Response) => {
  try {
    console.log("🚨 INCOMING API REQUEST:", req.query);
    const page = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 20;
    const limit = Math.min(requestedLimit, 50);
    const skip = (page - 1) * limit;

    let filter: any = {};
    let sortOption: any = {};
    let projection: any = null;
    if (req.query.sort === "lowest") {
      sortOption.price = 1; // Ascending price
    } else if (req.query.sort === "highest") {
      sortOption.price = -1; // Descending price
    }
    if (req.query.search) {
      // 1. Tell Mongo to use the Text Index
      filter.$text = { $search: req.query.search as string };

      // 2. Override the default sorting to sort by Relevance Score
      if (!req.query.sort) {
        // 👈 Ask MongoDB to calculate the score AND sort by it!
        projection = { score: { $meta: "textScore" } };
        sortOption = { score: { $meta: "textScore" } };
      }
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
    // 👇 The ONLY department filter you need 👇
    if (req.query.departments) {
      const depts = req.query.departments;

      const deptArray = Array.isArray(depts)
        ? (depts as string[])
        : (depts as string).split(",").map((d) => d.trim());

      const regexParts = deptArray.map((dept) => {
        if (dept.toUpperCase() === "MAN") return "^(man|men)$";
        if (dept.toUpperCase() === "WOMAN") return "^(woman|women)$";
        return `^${dept}$`;
      });

      // We apply it to the `department` field in MongoDB!
      filter.department = { $regex: regexParts.join("|"), $options: "i" };
    }

    const [allProducts, total] = await Promise.all([
      ProductModel.find(filter, projection)
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
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
