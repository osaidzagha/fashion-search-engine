import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import crypto from "crypto";
import { sendVerificationEmail } from "../utils/sendEmail";
import { validationResult } from "express-validator";

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

export const registerUser = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, email, password } = req.body;

    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const magicToken = crypto.randomBytes(20).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken: magicToken,
      verificationExpires: tokenExpiry,
    });

    if (user) {
      const verificationUrl = `${process.env.CLIENT_URL}/verify/${magicToken}`;
      await sendVerificationEmail(user.email, verificationUrl);
      res.status(201).json({
        message: "Registration successful. Please check your email.",
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (user && !user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email before logging in." });
    }
    if (user && (await bcrypt.compare(password, user.password))) {
      res.status(200).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id, user.role),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const user = await UserModel.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification token." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;

    const accessToken = generateToken(user.id, user.role);
    await user.save();

    res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: accessToken,
      message: "Email verified successfully! Welcome to Fashion Engine.",
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "Server error during verification." });
  }
};
