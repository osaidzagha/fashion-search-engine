import express from "express";
import {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getSearchSuggestions,
  getCategories,
} from "../controllers/productController";
import { ProductModel } from "../models/Product";
import { protect, admin } from "../middlewares/authMiddleware";

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────

// ✅ These must come BEFORE /:id to avoid "featured" being treated as an id
router.get("/featured", getFeaturedProducts);
router.get("/suggestions", getSearchSuggestions);
router.get("/categories", getCategories);
router.get("/", getProducts);

router.get("/:id/related", async (req, res) => {
  try {
    const product = await ProductModel.findOne({ id: req.params.id });
    if (!product) return res.json([]);

    // We build a strict query based on the current product
    const query: any = {
      department: product.department,
      id: { $ne: product.id }, // Don't show the exact same product we are looking at
    };

    // If the product has a category, strictly match it!
    if (product.category) {
      query.category = product.category;
    } else {
      // Fallback: If for some reason the category is missing,
      // match the brand so we at least show similar vibes, not random junk.
      query.brand = product.brand;
    }

    const related = await ProductModel.find(query)
      // I temporarily removed the strict 0.5x to 2.0x price limit.
      // Sometimes that price limit causes 0 results if the jacket is uniquely expensive!
      .limit(4)
      .lean();

    res.json(related);
  } catch (error) {
    console.error("Error fetching related products:", error);
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
