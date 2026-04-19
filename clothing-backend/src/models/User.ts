import mongoose, { Schema, Document } from "mongoose";

export interface IWatchlistItem {
  productId: string;
  addedAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  savedItems: string[];
  isVerified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  // ✅ Watchlist: array of { productId, addedAt }
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
    verificationToken: { type: String },
    verificationExpires: { type: Date },
    // ✅ New watchlist field
    watchlist: [
      {
        productId: { type: String, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);
