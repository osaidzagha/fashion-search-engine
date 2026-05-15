import mongoose, { Schema, Document } from "mongoose";

export interface IWatchlistItem {
  productId: string;
  trackedPrice: number;
  addedAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  savedItems: string[];
  isVerified: boolean;
  verificationToken?: string; // 👈 Now stores the 6-digit OTP
  verificationExpires?: Date;
  watchlist: IWatchlistItem[];
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    savedItems: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String }, // 👈 OTP stored here
    verificationExpires: { type: Date },
    watchlist: [
      {
        productId: { type: String, required: true },
        trackedPrice: { type: Number, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);
