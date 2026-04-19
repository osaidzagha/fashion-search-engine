import express from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
} from "../controllers/authController";

const router = express.Router();

// POST /api/auth/register
router.post("/register", registerUser);

// POST /api/auth/login
router.post("/login", loginUser);

router.get("/verify/:token", verifyEmail);
export default router;
