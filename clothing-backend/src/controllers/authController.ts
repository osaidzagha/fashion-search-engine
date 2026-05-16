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

// ✅ 30 minutes — gives users enough time to check email and verify
const OTP_EXPIRY_MS = 30 * 60 * 1000;
const otpExpiry = () => new Date(Date.now() + OTP_EXPIRY_MS);

// ✅ Resend cooldown — prevent spamming resend (60 seconds)
const RESEND_COOLDOWN_MS = 60 * 1000;

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

    // ── Already registered but NOT verified → resend fresh OTP ──
    if (existingUser && !existingUser.isVerified) {
      const otp = generateOTP();
      existingUser.verificationToken = otp;
      existingUser.verificationExpires = otpExpiry();
      await existingUser.save();

      console.log(
        `♻️  [registerUser] Unverified re-register: ${email} | OTP: ${otp}`,
      );

      try {
        await sendVerificationEmail(email, otp);
      } catch (mailError) {
        console.error("⚠️  Email failed for re-register:", mailError);
      }

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

    const userExists = await UserModel.findOne({ email });
    if (!userExists) {
      return res.status(400).json({
        message: "No account found. Please register again.",
      });
    }

    if (userExists.isVerified) {
      return res
        .status(400)
        .json({ message: "Account already verified. Please sign in." });
    }

    // Check if OTP expired specifically
    if (
      userExists.verificationToken === otp &&
      userExists.verificationExpires &&
      userExists.verificationExpires < new Date()
    ) {
      return res.status(400).json({
        message: "Code expired. Please click Resend to get a new one.",
      });
    }

    // Validate OTP
    if (
      userExists.verificationToken !== otp ||
      !userExists.verificationExpires ||
      userExists.verificationExpires < new Date()
    ) {
      return res.status(400).json({
        message: "Invalid code. Please check your email or click Resend.",
      });
    }

    userExists.isVerified = true;
    userExists.verificationToken = undefined;
    userExists.verificationExpires = undefined;

    const accessToken = generateToken(userExists.id, userExists.role);
    await userExists.save();

    return res.status(200).json({
      _id: userExists.id,
      name: userExists.name,
      email: userExists.email,
      role: userExists.role,
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

    // ✅ If user not found (TTL deleted them), re-create is needed
    if (!user) {
      return res.status(404).json({
        message:
          "Account not found. Please register again — your session may have expired.",
      });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ message: "Account already verified. Please sign in." });
    }

    // ✅ Cooldown check — prevent resend spam
    if (user.verificationExpires) {
      const timeLeft = user.verificationExpires.getTime() - Date.now();
      const remainingExpiry = OTP_EXPIRY_MS - RESEND_COOLDOWN_MS;
      if (timeLeft > remainingExpiry) {
        const secondsLeft = Math.ceil((timeLeft - remainingExpiry) / 1000);
        return res.status(429).json({
          message: `Please wait ${secondsLeft} seconds before requesting a new code.`,
        });
      }
    }

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
