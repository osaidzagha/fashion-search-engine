import express from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendOTP,
} from "../controllers/authController";
import { forgotPassword, resetPassword } from "../controllers/authController";

// 👇 Import your new Zod bouncers
import { validate } from "../middlewares/validateRequest";
import { registerSchema, loginSchema } from "../validators/authValidator";

const router = express.Router();

// 👇 The validate middleware intercepts the request BEFORE it hits your controller
router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);

// OTP routes
router.post("/verify", verifyEmail);
router.post("/resend-otp", resendOTP);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
