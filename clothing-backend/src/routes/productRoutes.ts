import express, { Router } from "express";
import {
  deleteProductMedia,
  getProducts,
  getProductById,
  getFeaturedProducts,
  getSearchSuggestions,
  getRelatedProducts,
  getCategories,
} from "../controllers/productController";
import { protect, admin } from "../middlewares/authMiddleware";

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

// ✅ Static routes must come BEFORE /:id
router.get("/featured", getFeaturedProducts);
router.get("/suggestions", getSearchSuggestions);
router.get("/categories", getCategories);
router.get("/", getProducts);

// ✅ Related products route (Uses your new controller!)
router.get("/:id/related", getRelatedProducts);

// ✅ Generic ID route MUST come last in the public section
router.get("/:id", getProductById);

// ── Admin routes ──────────────────────────────────────────────────────────────

router.delete("/:id/media", protect, admin, deleteProductMedia);

export default router;
