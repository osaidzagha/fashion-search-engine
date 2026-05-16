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
  verificationToken?: string;
  verificationExpires?: Date;
  watchlist: IWatchlistItem[];
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    savedItems: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationExpires: { type: Date },
    watchlist: [
      {
        productId: { type: String, required: true },
        trackedPrice: { type: Number, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// ✅ TTL: auto-delete unverified users 30 minutes after verificationExpires
// Verified users are safe — verificationExpires is cleared on verification
UserSchema.index(
  { verificationExpires: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { isVerified: false },
  },
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);
