import mongoose, { Schema, Document } from "mongoose";

// 1. TypeScript Types
export interface IUser extends Document {
  name: string;
  email: string;
  password: string; // This will be hashed!
  role: "user" | "admin"; // 👇 Here is your Role System!
  savedItems: string[]; // For later: saving product IDs to a wishlist
}

// 2. MongoDB Schema
const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user", // Everyone is a normal user by default
    },
    savedItems: [{ type: String }], // Array of Product IDs
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt dates
  },
);

// 3. Export the Model
export const UserModel = mongoose.model<IUser>("User", UserSchema);
