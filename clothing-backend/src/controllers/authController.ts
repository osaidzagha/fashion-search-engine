import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { RowDataPacket, ResultSetHeader } from "mysql2"; // ← Types from mysql2
import { pool } from "../db";                            // ← Our MySQL connection pool
import { sendVerificationEmail } from "../utils/sendEmail";
import { validationResult } from "express-validator";

// ─── Helpers (unchanged) ──────────────────────────────────────────────────────

const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const OTP_EXPIRY_MS = 30 * 60 * 1000;
// Returns a JS Date 30 minutes from now — we store it in MySQL as a TIMESTAMP
const otpExpiry = () => new Date(Date.now() + OTP_EXPIRY_MS);
const RESEND_COOLDOWN_MS = 60 * 1000;
const sanitizeEmail = (email: string) => email.toLowerCase().trim();

// ─── registerUser ─────────────────────────────────────────────────────────────

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<Response | any> => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const safeEmail = sanitizeEmail(req.body.email);
    const { name, password } = req.body;

    // ── STEP 1: Check if this email already exists ────────────────────────────
    //
    // OLD (Mongoose):  UserModel.findOne({ email: safeEmail })
    //
    // NEW (MySQL):
    //   pool.query() always returns a tuple: [rows, fields]
    //   We destructure and only take the first element: [rows]
    //   rows is an array — even if there's one user, it comes back as [{ user_id: 1, ... }]
    //   So we read the single user as rows[0]
    //
    //   The ? is a placeholder. MySQL will safely substitute safeEmail into it.
    //   NEVER write: `WHERE user_email = '${safeEmail}'` — that's SQL injection.
    //
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, user_name, user_email, auth_provider, is_verified FROM users WHERE user_email = ?",
      [safeEmail],
    );
    const existingUser = rows[0]; // undefined if no match, object if found

    // ── Google account trying to register with email/password ──
    if (existingUser && existingUser.auth_provider === "google") {
      return res.status(400).json({
        message:
          "This email is linked to a Google account. Please sign in with Google.",
      });
    }

    // ── Already registered but NOT verified — resend a fresh OTP ──
    if (existingUser && !existingUser.is_verified) {
      const otp = generateOTP();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // UPDATE: change multiple columns for this specific user
      // SET col = ? means "set this column to the next ? value"
      // The order of ? values in the array must match the order of ? in the SQL
      await pool.query(
        `UPDATE users
         SET user_name            = ?,
             user_password        = ?,
             verification_token   = ?,
             verification_expires = ?
         WHERE user_email = ?`,
        [name, hashedPassword, otp, otpExpiry(), safeEmail],
      );

      try {
        await sendVerificationEmail(safeEmail, otp);
      } catch (mailError) {
        console.error("⚠️ [registerUser] Email delivery failed:", mailError);
      }
      return res.status(200).json({
        message: "Account updated. Please check your email for the new code.",
        email: safeEmail,
      });
    }

    // ── Already registered AND verified ──
    if (existingUser && existingUser.is_verified) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ── New user: INSERT a fresh row ──────────────────────────────────────────
    //
    // OLD (Mongoose):  UserModel.create({ name, email, password, ... })
    //
    // NEW (MySQL):
    //   INSERT INTO tableName (col1, col2, ...) VALUES (?, ?, ...)
    //   We cast the result as ResultSetHeader — that's the MySQL2 type for INSERT/UPDATE results
    //   result.insertId gives us the auto-incremented user_id MySQL assigned
    //
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOTP();

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users
         (user_name, user_email, user_password, is_verified,
          verification_token, verification_expires, auth_provider)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, safeEmail, hashedPassword, false, otp, otpExpiry(), "local"],
    );

    // result.affectedRows tells us if the insert worked (should be 1)
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Invalid user data" });
    }

    try {
      await sendVerificationEmail(safeEmail, otp);
    } catch (mailError) {
      console.error("⚠️ [registerUser] Email delivery failed:", mailError);
    }

    // Response shape is identical to before — frontend doesn't change
    return res.status(201).json({
      message: "Registration successful. Please check your email.",
      email: safeEmail,
    });
  } catch (error) {
    console.error("❌ [registerUser] Error:", error);
    return res
      .status(500)
      .json({ message: "Server error during registration." });
  }
};

// ─── loginUser ────────────────────────────────────────────────────────────────

export const loginUser = async (
  req: Request,
  res: Response,
): Promise<Response | any> => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const safeEmail = sanitizeEmail(req.body.email);
    const { password } = req.body;

    // ── Find user by email ────────────────────────────────────────────────────
    //
    // We SELECT user_password here because we need it for bcrypt.compare below.
    // In Mongoose we had `select("+password")` — here we just include it in the SELECT.
    //
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, user_name, user_email, user_password,
              role, auth_provider, is_verified
       FROM users
       WHERE user_email = ?`,
      [safeEmail],
    );
    const user = rows[0]; // undefined if not found

    // ── Google account trying to log in with a password ──
    if (user && user.auth_provider === "google") {
      return res.status(400).json({
        message:
          "This account uses Google sign-in. Please use the 'Continue with Google' button.",
      });
    }

    if (user && !user.is_verified) {
      return res.status(401).json({
        message:
          "Please verify your account before logging in. Check your email for the code.",
      });
    }

    // bcrypt.compare still works exactly the same — nothing changes here
    if (
      user &&
      user.user_password &&
      (await bcrypt.compare(password, user.user_password))
    ) {
      // generateToken needs a string id — MySQL gives us an integer, so convert with .toString()
      return res.status(200).json({
        _id: user.user_id.toString(),
        name: user.user_name,
        email: user.user_email,
        role: user.role,
        token: generateToken(user.user_id.toString(), user.role),
      });
    }

    return res.status(401).json({ message: "Invalid email or password" });
  } catch (error) {
    console.error("❌ [loginUser] Error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
};

// ─── verifyEmail ──────────────────────────────────────────────────────────────

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<Response | any> => {
  try {
    const safeEmail = sanitizeEmail(req.body.email);
    const { otp } = req.body;

    if (!safeEmail || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    // ── Find the unverified user ──────────────────────────────────────────────
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, user_name, user_email, role,
              is_verified, verification_token, verification_expires
       FROM users
       WHERE user_email = ?`,
      [safeEmail],
    );
    const user = rows[0];

    if (!user) {
      return res
        .status(400)
        .json({ message: "No account found. Please register again." });
    }

    if (user.is_verified) {
      return res
        .status(400)
        .json({ message: "Account already verified. Please sign in." });
    }

    // ── Validate OTP and expiry ───────────────────────────────────────────────
    //
    // MySQL returns TIMESTAMP columns as JS Date objects automatically.
    // So user.verification_expires is already a Date — we can compare directly.
    //
    if (
      user.verification_token !== otp ||
      !user.verification_expires ||
      new Date(user.verification_expires) < new Date()
    ) {
      return res.status(400).json({
        message:
          "Invalid or expired code. Please check your email or click Resend.",
      });
    }

    // ── Mark user as verified, clear OTP fields ───────────────────────────────
    //
    // We set verification_token and verification_expires to NULL
    // (NULL in SQL = no value, same concept as undefined in MongoDB)
    //
    await pool.query(
      `UPDATE users
       SET is_verified          = 1,
           verification_token   = NULL,
           verification_expires = NULL
       WHERE user_email = ?`,
      [safeEmail],
    );

    const accessToken = generateToken(user.user_id.toString(), user.role);

    // Response shape identical to before
    return res.status(200).json({
      _id: user.user_id.toString(),
      name: user.user_name,
      email: user.user_email,
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

// ─── resendOTP ────────────────────────────────────────────────────────────────

export const resendOTP = async (
  req: Request,
  res: Response,
): Promise<Response | any> => {
  try {
    const safeEmail = sanitizeEmail(req.body.email);
    if (!safeEmail)
      return res.status(400).json({ message: "Email is required." });

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, is_verified, verification_expires
       FROM users
       WHERE user_email = ?`,
      [safeEmail],
    );
    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        message:
          "Account not found. Please register again — your session may have expired.",
      });
    }

    if (user.is_verified) {
      return res
        .status(400)
        .json({ message: "Account already verified. Please sign in." });
    }

    // ── Cooldown check ────────────────────────────────────────────────────────
    //
    // MySQL returns the TIMESTAMP as a JS Date, so .getTime() works normally.
    //
    if (user.verification_expires) {
      const timeLeft = new Date(user.verification_expires).getTime() - Date.now();
      const remainingExpiry = OTP_EXPIRY_MS - RESEND_COOLDOWN_MS;
      if (timeLeft > remainingExpiry) {
        const secondsLeft = Math.ceil((timeLeft - remainingExpiry) / 1000);
        return res.status(429).json({
          message: `Please wait ${secondsLeft} seconds before requesting a new code.`,
        });
      }
    }

    const otp = generateOTP();

    await pool.query(
      `UPDATE users
       SET verification_token   = ?,
           verification_expires = ?
       WHERE user_email = ?`,
      [otp, otpExpiry(), safeEmail],
    );

    try {
      await sendVerificationEmail(safeEmail, otp);
    } catch (mailError) {
      console.error("⚠️ [resendOTP] Email failed:", mailError);
    }

    return res.status(200).json({ message: "New verification code sent." });
  } catch (error) {
    console.error("❌ [resendOTP] Error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── forgotPassword ───────────────────────────────────────────────────────────

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<Response | any> => {
  try {
    const safeEmail = sanitizeEmail(req.body.email);
    if (!safeEmail)
      return res.status(400).json({ message: "Email is required." });

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, auth_provider FROM users WHERE user_email = ?",
      [safeEmail],
    );
    const user = rows[0];

    // ── Google-only account can't reset a password they don't have ──
    if (user && user.auth_provider === "google") {
      return res.status(400).json({
        message:
          "This account uses Google sign-in and has no password to reset.",
      });
    }

    // Don't reveal whether the account exists — always send the same response
    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with that email, a reset code has been sent.",
      });
    }

    const otp = generateOTP();

    await pool.query(
      `UPDATE users
       SET verification_token   = ?,
           verification_expires = ?
       WHERE user_email = ?`,
      [otp, otpExpiry(), safeEmail],
    );

    try {
      await sendVerificationEmail(safeEmail, otp);
    } catch (mailError) {
      console.error("⚠️ [forgotPassword] Email failed:", mailError);
    }

    return res.status(200).json({
      message:
        "If an account exists with that email, a reset code has been sent.",
    });
  } catch (error) {
    console.error("❌ [forgotPassword] Error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── resetPassword ────────────────────────────────────────────────────────────

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<Response | any> => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const safeEmail = sanitizeEmail(req.body.email);
    const { otp, newPassword } = req.body;

    if (!safeEmail || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, OTP, and new password are required." });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, verification_token, verification_expires
       FROM users
       WHERE user_email = ?`,
      [safeEmail],
    );
    const user = rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid request." });
    }

    if (
      user.verification_token !== otp ||
      !user.verification_expires ||
      new Date(user.verification_expires) < new Date()
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset code." });
    }

    // Hash the new password then store it, clear OTP fields
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `UPDATE users
       SET user_password        = ?,
           verification_token   = NULL,
           verification_expires = NULL
       WHERE user_email = ?`,
      [hashedPassword, safeEmail],
    );

    return res
      .status(200)
      .json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("❌ [resetPassword] Error:", error);
    return res
      .status(500)
      .json({ message: "Server error during password reset." });
  }
};
