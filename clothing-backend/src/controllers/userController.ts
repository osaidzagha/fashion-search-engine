import bcrypt from "bcryptjs";
import { UserModel } from "../models/User";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Request, Response } from "express";
// ─── PUT /api/users/profile ───────────────────────────────────────────────────
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { name, email } = req.body;

    if (!name && !email) {
      res.status(400).json({ message: "Nothing to update." });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (email && email.toLowerCase() !== user.email) {
      const conflict = await UserModel.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (conflict) {
        res.status(409).json({ message: "Email is already in use." });
        return;
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name.trim();

    await user.save();

    res.json({
      message: "Profile updated.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
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
    res.json(req.user);
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
    const userId = req.user!._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res
        .status(400)
        .json({ message: "Current and new password are required." });
      return;
    }

    if (newPassword.length < 8) {
      res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });
      return;
    }

    const user = await UserModel.findById(userId).select("+password");
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Current password is incorrect." });
      return;
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      res
        .status(400)
        .json({ message: "New password must differ from the current one." });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

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
    const userId = req.user!._id;
    const { priceAlertEnabled } = req.body;

    if (typeof priceAlertEnabled !== "boolean") {
      res.status(400).json({ message: "priceAlertEnabled must be a boolean." });
      return;
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { "preferences.priceAlertEnabled": priceAlertEnabled } },
      { new: true },
    );

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({
      message: "Preferences updated.",
      preferences: user.preferences,
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
    const userId = req.user!._id;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ message: "Password confirmation required." });
      return;
    }

    const user = await UserModel.findById(userId).select("+password");
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Incorrect password." });
      return;
    }

    await UserModel.findByIdAndDelete(userId);

    res.json({ message: "Account permanently deleted." });
  } catch (err) {
    console.error("[UserController] deleteAccount:", err);
    res.status(500).json({ message: "Failed to delete account." });
  }
};
