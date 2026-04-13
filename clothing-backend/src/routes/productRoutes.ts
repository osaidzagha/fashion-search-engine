import express from "express";
import { getProducts } from "../controllers/productController";
import { getProductById } from "../controllers/productController";
import { ProductModel } from "../models/Product";

const router = express.Router();

// 1. Define the route for fetching all products
router.get("/", getProducts);

// 2. Define the route for fetching related products
// NOTE: It is best practice to put specific routes (like /:id/related)
// BEFORE generic routes (like /:id) so Express doesn't get confused!
router.get("/:id/related", async (req, res) => {
  try {
    const product = await ProductModel.findOne({ id: req.params.id });
    if (!product) return res.json([]);

    const related = await ProductModel.find({
      department: product.department,
      category: { $ne: product.category },
      price: {
        $gte: product.price * 0.5,
        $lte: product.price * 2.0,
      },
      id: { $ne: product.id },
    })
      .limit(4)
      .lean();

    res.json(related);
  } catch (error) {
    console.error("Error fetching related products:", error);
    res.status(500).json([]);
  }
});

// 3. Define the route for fetching a single product by ID
router.get("/:id", getProductById);

// 4. Export the fully built router at the very end!
export default router;
