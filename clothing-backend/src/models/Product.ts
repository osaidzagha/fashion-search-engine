import mongoose, { Schema, Document } from "mongoose";

// 1. We tell TypeScript what our data looks like (TypeScript Land)
export interface IProduct extends Document {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  brand: string;
  images: string[];
  link: string;
  timestamp: Date;
  department: string;
  description?: string;
  color?: string;
  composition?: string;
  category?: string;
  sizes?: string[];

  // FIX 1: Pure TypeScript types!
  videos?: string[];
  priceHistory?: { price: number; date: Date }[];
}

// 2. We build the strict rules for the database (MongoDB Land)
const ProductSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number, required: false },
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

  // FIX 2: Added the Mongoose configurations here!
  videos: { type: [String], required: false },
  priceHistory: [
    {
      price: { type: Number },
      date: { type: Date, default: Date.now },
    },
  ],
});

ProductSchema.index(
  {
    name: "text",
    brand: "text",
    color: "text",
    description: "text",
  },
  {
    // Weights define relevance ranking. Higher number = more important!
    weights: {
      name: 10,
      brand: 5,
      color: 3,
      description: 1,
    },
    name: "TextSearchIndex",
  },
);

// ─── THE PERFORMANCE INDEXES ──────────────────────────────────────────────────

// 1. The Core Browsing Index
ProductSchema.index({ department: 1, brand: 1, price: 1 });

// 2. The Text Search Index (COMMENTED OUT - ALREADY EXISTS IN MONGODB)
// ProductSchema.index({ name: "text", description: "text", category: "text" });

// 3. The Sale/Filter Index
ProductSchema.index({ originalPrice: -1, price: 1 });

// 4. The Facet Helper
ProductSchema.index({ color: 1, sizes: 1 });

// 3. We compile the Schema into a Model
export const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);
