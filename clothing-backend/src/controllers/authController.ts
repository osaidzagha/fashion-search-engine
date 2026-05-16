// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import { sendVerificationEmail } from "../utils/sendEmail";
import { validationResult } from "express-validator";

const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
const otpExpiry = () => new Date(Date.now() + 15 * 60 * 1000);

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });

    // ── Already registered but NOT verified → resend a fresh OTP ──
    if (existingUser && !existingUser.isVerified) {
      const otp = generateOTP();
      existingUser.verificationToken = otp;
      existingUser.verificationExpires = otpExpiry();
      await existingUser.save();

      console.log(
        `♻️  [registerUser] Unverified user re-registered: ${email} | OTP: ${otp}`,
      );

      try {
        await sendVerificationEmail(email, otp);
      } catch (mailError) {
        console.error("⚠️  Email failed for re-register:", mailError);
      }

      // Return same shape as normal register so frontend navigates to OTP page
      return res.status(200).json({
        message: "A new verification code has been sent to your email.",
        email,
      });
    }

    // ── Already registered AND verified → reject ──
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ── New user ──
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOTP();

    console.log("-----------------------------------------");
    console.log(`DEBUG OTP FOR ${email}: ${otp}`);
    console.log("-----------------------------------------");

    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken: otp,
      verificationExpires: otpExpiry(),
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid user data" });
    }

    try {
      await sendVerificationEmail(user.email, otp);
      console.log(`✅ Verification email sent to ${user.email}`);
    } catch (mailError) {
      console.error("⚠️  [registerUser] Email delivery failed:", mailError);
      console.log(`📋 Manual OTP for ${user.email}: ${otp}`);
    }

    return res.status(201).json({
      message: "Registration successful. Please check your email.",
      email: user.email,
    });
  } catch (error) {
    console.error("❌ [registerUser] Error:", error);
    return res
      .status(500)
      .json({ message: "Server error during registration." });
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (user && !user.isVerified) {
      return res.status(401).json({
        message:
          "Please verify your account before logging in. Check your email for the code.",
      });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      return res.status(200).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id, user.role),
      });
    }

    return res.status(401).json({ message: "Invalid email or password" });
  } catch (error) {
    console.error("❌ [loginUser] Error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    // First check if user exists at all
    const userExists = await UserModel.findOne({ email });
    if (!userExists) {
      return res
        .status(400)
        .json({ message: "No account found for this email." });
    }

    // Check if OTP is expired specifically
    const expiredUser = await UserModel.findOne({
      email,
      verificationToken: otp,
      verificationExpires: { $lte: Date.now() },
    });
    if (expiredUser) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new one.",
      });
    }

    // Check OTP is valid and not expired
    const user = await UserModel.findOne({
      email,
      verificationToken: otp,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid verification code. Please try again." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;

    const accessToken = generateToken(user.id, user.role);
    await user.save();

    return res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: accessToken,
      message: "Account verified successfully! Welcome to DOPE.",
    });
  } catch (error) {
    console.error("❌ [verifyEmail] Error:", error);
    return res
      .status(500)
      .json({ message: "Server error during verification." });
  }
};

export const resendOTP = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.isVerified)
      return res.status(400).json({ message: "Account already verified." });

    const otp = generateOTP();
    user.verificationToken = otp;
    user.verificationExpires = otpExpiry();
    await user.save();

    console.log(`🔁 [resendOTP] New OTP for ${email}: ${otp}`);

    try {
      await sendVerificationEmail(email, otp);
    } catch (mailError) {
      console.error("⚠️  [resendOTP] Email failed:", mailError);
    }

    return res.status(200).json({ message: "New verification code sent." });
  } catch (error) {
    console.error("❌ [resendOTP] Error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};
