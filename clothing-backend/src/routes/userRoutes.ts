import { Router } from "express";
import {
  getUserProfile, // <-- 1. Import the new function
  updateProfile,
  updatePassword,
  updatePreferences,
  deleteAccount,
} from "../controllers/userController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// All user routes require a valid JWT — protect middleware reads
// req.headers.authorization and attaches the decoded user to req.user.

router.get("/profile", protect, getUserProfile); // <-- 2. Add the GET route
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);
router.put("/preferences", protect, updatePreferences);
router.delete("/account", protect, deleteAccount);

export default router;
