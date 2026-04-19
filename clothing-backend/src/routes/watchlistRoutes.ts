import express from "express";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlistController";
import { protect } from "../middlewares/authMiddleware";

const router = express.Router();

// All watchlist routes require a logged-in user
router.use(protect);

router.get("/", getWatchlist);
router.post("/:productId", addToWatchlist);
router.delete("/:productId", removeFromWatchlist);

export default router;
