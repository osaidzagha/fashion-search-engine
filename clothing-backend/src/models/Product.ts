import mongoose, { Schema, Document } from "mongoose";

// 1. We tell TypeScript what our data looks like
export interface IProduct extends Document {
  id: string;
  name: string;
  price: number;
  currency: string;
  brand: string;
  images: string[];
  link: string;
  timestamp: Date;
  department: string; // 👈 Added here! No '?' because it is required.
  description?: string;
  color?: string;
  composition?: string;
  category?: string;
  sizes?: string[];
}

// 2. We build the strict rules for the database
const ProductSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true, default: "TRY" },
  brand: { type: String, required: true },
  images: { type: [String], required: true },
  link: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  department: { type: String, required: true },
  description: { type: String, default: "" },
  color: { type: String, default: "" },
  composition: { type: String, default: "" },
  category: { type: String, default: "" },
  sizes: { type: [String], default: [] },
});

// 3. We compile the Schema into a Model
export const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);
