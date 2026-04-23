import express from "express";
import {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getSearchSuggestions,
} from "../controllers/productController";
import { ProductModel } from "../models/Product";
import { protect, admin } from "../middlewares/authMiddleware";

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────

// ✅ These must come BEFORE /:id to avoid "featured" being treated as an id
router.get("/featured", getFeaturedProducts);
router.get("/suggestions", getSearchSuggestions);

router.get("/", getProducts);

router.get("/:id/related", async (req, res) => {
  try {
    const product = await ProductModel.findOne({ id: req.params.id });
    if (!product) return res.json([]);

    const related = await ProductModel.find({
      department: product.department,
      category: {
        $regex: product.category?.split("-")[0] || "",
        $options: "i",
      },
      price: { $gte: product.price * 0.5, $lte: product.price * 2.0 },
      id: { $ne: product.id },
    })
      .limit(4)
      .lean();

    res.json(related);
  } catch (error) {
    res.status(500).json([]);
  }
});

router.get("/:id", getProductById);

// ── Admin routes ──────────────────────────────────────────────────────────────

router.post("/", protect, admin, (req, res) => {
  res.status(200).json({ message: "Admin Access Granted" });
});

router.delete("/:id", protect, admin, (req, res) => {
  res.status(200).json({ message: `Product ${req.params.id} deleted` });
});

export default router;
