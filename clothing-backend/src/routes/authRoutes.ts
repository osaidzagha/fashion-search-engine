import express from "express";
import { body } from "express-validator";
import {
  registerUser,
  loginUser,
  verifyEmail,
} from "../controllers/authController";

const router = express.Router();

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("name").trim().notEmpty(),
  ],
  registerUser,
);

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  loginUser,
);

// 👈 Changed to POST, no longer uses a URL parameter
router.post("/verify", verifyEmail);

export default router;
