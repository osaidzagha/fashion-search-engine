import { Router } from "express";
import {
  updateProfile,
  updatePassword,
  updatePreferences,
  deleteAccount,
} from "../controllers/userController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// All user routes require a valid JWT — protect middleware reads
// req.headers.authorization and attaches the decoded user to req.user.
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);
router.put("/preferences", protect, updatePreferences);
router.delete("/account", protect, deleteAccount);

export default router;

// ─── Register in server.ts ────────────────────────────────────────────────────
// import userRoutes from "./routes/userRoutes";
// app.use("/api/users", userRoutes);
