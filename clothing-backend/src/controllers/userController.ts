import bcrypt from "bcryptjs";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Request, Response } from "express";
import { pool } from "../db";
import { ResultSetHeader, RowDataPacket } from "mysql2";
// ─── PUT /api/users/profile ───────────────────────────────────────────────────
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.user_id;
    const { name, email } = req.body;

    if (!name && !email) {
      res.status(400).json({ message: "Nothing to update." });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE user_id = ?",
      [userId],
    );
    const user = rows[0];
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (email && email.toLowerCase() !== user.user_email) {
      const [conflictRows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM users WHERE user_email = ? AND user_id != ?",
        [email.toLowerCase(), userId],
      );
      const conflict = conflictRows.length > 0;
      if (conflict) {
        res.status(409).json({ message: "Email is already in use." });
        return;
      }
    }

    await pool.query(
      "UPDATE users SET user_name = ?, user_email = ? WHERE user_id = ?",
      [
        name ? name.trim() : user.user_name, // new name OR keep old
        email ? email.toLowerCase() : user.user_email, // new email OR keep old
        userId,
      ],
    );
    res.json({
      message: "Profile updated.",
      user: {
        _id: user.user_id,
        name: name ? name.trim() : user.user_name,
        email: email ? email.toLowerCase() : user.user_email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[UserController] updateProfile:", err);
    res.status(500).json({ message: "Failed to update profile." });
  }
};
export const getUserProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (req.user) {
    const u = req.user as any;
    // Return all fields that the frontend Profile page needs
    res.json({
      _id: u.user_id,
      name: u.user_name,
      email: u.user_email,
      authProvider: u.auth_provider,
      priceAlertEnabled: u.price_alert_enabled,
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};
// ─── PUT /api/users/password ──────────────────────────────────────────────────
export const updatePassword = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res
        .status(400)
        .json({ message: "Current and new password are required." });
      return;
    }

    if (newPassword.length < 6) {
      res
        .status(400)
        .json({ message: "New password must be at least 6 characters." });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE user_id = ?",
      [userId],
    );
    const user = rows[0];

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    const isMatch = await bcrypt.compare(currentPassword, user.user_password);
    if (!isMatch) {
      res.status(401).json({ message: "Current password is incorrect." });
      return;
    }

    // ✅ Correct way
    const isSame = await bcrypt.compare(newPassword, user.user_password);
    if (isSame) {
      res
        .status(400)
        .json({ message: "New password must differ from the current one." });
      return;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET user_password = ? WHERE user_id = ?", [
      hashedPassword,
      userId,
    ]);

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("[UserController] updatePassword:", err);
    res.status(500).json({ message: "Failed to update password." });
  }
};

// ─── PUT /api/users/preferences ──────────────────────────────────────────────
export const updatePreferences = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.user_id;
    const { priceAlertEnabled } = req.body;

    if (typeof priceAlertEnabled !== "boolean") {
      res.status(400).json({ message: "priceAlertEnabled must be a boolean." });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE users SET price_alert_enabled = ? WHERE user_id = ?",
      [priceAlertEnabled, userId],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({
      message: "Preferences updated.",
      preferences: { priceAlertEnabled },
    });
  } catch (err) {
    console.error("[UserController] updatePreferences:", err);
    res.status(500).json({ message: "Failed to update preferences." });
  }
};

// ─── DELETE /api/users/account ────────────────────────────────────────────────
export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.user_id;
    const { password } = req.body;

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE user_id = ?",
      [userId],
    );
    const user = rows[0];
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Google users have no password — block the flow clearly
    if (user.auth_provider === "google") {
      res.status(400).json({
        message:
          "Accounts signed in with Google cannot be deleted with a password. Please contact support.",
      });
      return;
    }

    if (!password) {
      res.status(400).json({ message: "Password confirmation required." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.user_password);
    if (!isMatch) {
      res.status(401).json({ message: "Incorrect password." });
      return;
    }

    await pool.query("DELETE FROM users WHERE user_id = ?", [userId]);

    res.json({ message: "Account permanently deleted." });
  } catch (err) {
    console.error("[UserController] deleteAccount:", err);
    res.status(500).json({ message: "Failed to delete account." });
  }
};
