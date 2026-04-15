import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";

// Helper function to generate our VIP wristband (JWT)
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

    // 3. Create the user
    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      // Note: We don't pass 'role' here, so it safely defaults to "user"
    });

    // 4. Send back the token and user data
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id, user.role),
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user by email
    const user = await UserModel.findOne({ email });

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
