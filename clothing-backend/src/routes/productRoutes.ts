import express from "express";
import { getProducts, getProductById } from "../controllers/productController";
import { ProductModel } from "../models/Product";

// 👇 1. Import your new Security Bouncers
import { protect, admin } from "../middlewares/authMiddleware";

const router = express.Router();

// ==========================================
// 🟢 PUBLIC ROUTES (Anyone can access)
// ==========================================

router.get("/", getProducts);

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

router.get("/:id", getProductById);

// ==========================================
// 🔴 PROTECTED ADMIN ROUTES (Admins Only)
// ==========================================

// Example: Route to manually add a new product
router.post("/", protect, admin, (req, res) => {
  res
    .status(200)
    .json({ message: "Admin Access Granted: You can create products!" });
});

// Example: Route to delete a product
router.delete("/:id", protect, admin, (req, res) => {
  res
    .status(200)
    .json({
      message: `Admin Access Granted: Product ${req.params.id} deleted!`,
    });
});

export default router;
