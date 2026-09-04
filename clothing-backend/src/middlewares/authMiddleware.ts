import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { pool } from "../db";
import { RowDataPacket } from "mysql2";

// 1. Force Express to globally recognize your exact database user model
declare global {
  namespace Express {
    interface User {
      user_id: number;
      user_name: string;
      user_email: string;
      role: string;
      auth_provider: string;
      is_verified: boolean;
      price_alert_enabled: boolean;
    }
  }
}

// 2. Keep the AuthRequest name, but make it a perfect clone of standard Request
export interface AuthRequest extends Request {}

interface JwtPayload {
  id: string;
  role: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as JwtPayload;

      const [userRows] = await pool.query<RowDataPacket[]>(
        "SELECT user_id, user_name, user_email, role, auth_provider, is_verified, price_alert_enabled FROM users WHERE user_id = ?",
        [decoded.id],
      );
      const user = userRows[0];

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      req.user = user as Express.User;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

export const admin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};
