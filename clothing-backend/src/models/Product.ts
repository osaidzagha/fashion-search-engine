import mongoose, { Schema, Document } from "mongoose";

// 1. We tell TypeScript what our data looks like
export interface IProduct extends Document {
  name: string;
  price: number;
  currency: string;
  brand: string;
  imageUrl: string;
  link: string;
  timestamp: Date;
}

// 2. We build the strict rules for the database
const ProductSchema: Schema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true, default: "TRY" },
  brand: { type: String, required: true },
  imageUrl: { type: String, required: true },
  link: { type: String, required: true, unique: true }, // Prevents saving the same item twice!
  timestamp: { type: Date, default: Date.now },
});

// 3. We compile the Schema into a Model
export const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);
