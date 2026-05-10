import { Router } from "express";
import {
  getDashboard,
  runScraper,
  killScraper,
  toggleCampaignHero,
} from "../controllers/adminController";
// 👇 1. Import your new media controller alongside the delete product one
import {
  deleteProduct,
  deleteProductMedia,
} from "../controllers/productController";
// 👇 2. Import your security middlewares (adjust path if needed)
import { protect, admin } from "../middlewares/authMiddleware";

const router = Router();

// 👇 3. Apply the 'protect' and 'admin' middlewares to all these sensitive routes
router.get("/dashboard", protect, admin, getDashboard);
router.post("/scrape/:brand", protect, admin, runScraper);
router.post("/scrape/stop/:brand", protect, admin, killScraper);
router.put("/products/:id/campaign", protect, admin, toggleCampaignHero);
router.delete("/products/:id", protect, admin, deleteProduct);

// 👇 4. ADD THE NEW MEDIA DELETE ROUTE HERE
router.delete("/products/:id/media", protect, admin, deleteProductMedia);

export default router;
