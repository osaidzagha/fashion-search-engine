import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import crypto from "crypto";
import { sendVerificationEmail } from "../utils/sendEmail";
const generateToken = (id: string, role: string) => {
  // It signs the token using a secret key only the server knows
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: "30d", // User stays logged in for 30 days
  });
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Hash the password (Security Layer)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 👇 3. NEW: Generate the Magic Link Token
    const magicToken = crypto.randomBytes(20).toString("hex");

    // 👇 4. NEW: Set an expiration date (e.g., 24 hours from now)
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 3. Create the user
    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken: magicToken,
      verificationExpires: tokenExpiry,
    });
    if (user) {
      // 👇 6. NEW: Simulate the Emailer
      const verificationUrl = `http://localhost:5173/verify/${magicToken}`;
      await sendVerificationEmail(user.email, verificationUrl);

      // 👇 7. NEW: Do NOT send the JWT yet. Force them to check their email.
      res.status(201).json({
        message:
          "Registration successful. Please check your email to verify your account.",
        // Notice we are NOT sending a token back here anymore!
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user by email
    const user = await UserModel.findOne({ email });
    if (user && !user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email before logging in." });
    }
    // 2. If user exists, compare the passwords
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
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // 1. Grab the token from the URL parameters
    const { token } = req.params;

    // 2. Look for a user with this exact token AND make sure it hasn't expired
    // $gt means "Greater Than" - the expiration date must be greater than right now
    const user = await UserModel.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification token." });
    }

    // 3. User found! Activate the account and wipe the temporary tokens
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;

    // 🔑 CAPTURE THE TOKEN: Store it in a variable so we can send it
    const accessToken = generateToken(user.id, user.role);

    await user.save();

    res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: accessToken, // Handing the "wristband" to the user
      message: "Email verified successfully! Welcome to Fashion Engine.",
    });
  } catch (error: any) {
    console.error("Verification Error:", error);
    res.status(500).json({ message: "Server error during verification." });
  }
};
