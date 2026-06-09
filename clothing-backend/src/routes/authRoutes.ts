import express from "express";
import passport from "passport";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendOTP,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { validate } from "../middlewares/validateRequest";
import { registerSchema, loginSchema } from "../validators/authValidator";

const router = express.Router();

// ─── Email / password ─────────────────────────────────────────────────────────
router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);

// ─── OTP ──────────────────────────────────────────────────────────────────────
router.post("/verify", verifyEmail);
router.post("/resend-otp", resendOTP);

// ─── Password reset ───────────────────────────────────────────────────────────
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// Step 1 — redirect user to Google's consent screen
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Step 2 — Google redirects back here with a code
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/oauth/callback?error=failed`,
  }),
  (req: express.Request, res: express.Response) => {
    // req.user is set by Passport's GoogleStrategy — it should be your DB user
    const user = req.user as any;
    res.redirect(
      `${process.env.CLIENT_URL}/oauth/callback?token=${user.token}`,
    );
  },
);

export default router;
