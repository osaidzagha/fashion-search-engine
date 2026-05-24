import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  brand: string;
  images: string[];
  link: string;
  department: string;
  description?: string;
  color?: string;
  composition?: string;
  category?: string;
  sizes?: string[];
  videos?: string[];
  isCampaignHero?: boolean;
  priceHistory?: { price: number; date: Date }[];
  stockHistory?: { sizes: string[]; date: Date }[];
  lastSeenAt?: Date;
  available?: boolean;
}

const ProductSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    currency: { type: String, required: true, default: "TRY" },
    brand: { type: String, required: true },
    images: { type: [String], required: true },
    link: { type: String, required: true },
    department: { type: String, required: true },
    description: { type: String, default: "" },
    color: { type: String, default: "" },
    composition: { type: String, default: "" },
    category: { type: String, default: "" },
    sizes: { type: [String], default: [] },
    videos: { type: [String] },
    isCampaignHero: { type: Boolean, default: false },
    priceHistory: [
      {
        price: { type: Number },
        date: { type: Date, default: Date.now },
      },
    ],
    stockHistory: [
      {
        sizes: { type: [String], default: [] },
        date: { type: Date, default: Date.now },
      },
    ],
    lastSeenAt: { type: Date, default: Date.now },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ─── Search Indexes ───────────────────────────────────────────────────────────
ProductSchema.index(
  { name: "text", brand: "text", color: "text", description: "text" },
  {
    weights: { name: 10, brand: 5, color: 3, description: 1 },
    name: "TextSearchIndex",
  },
);

// ─── Sorting & Filtering Indexes ──────────────────────────────────────────────
ProductSchema.index({ department: 1, brand: 1, price: 1 });
ProductSchema.index({ originalPrice: -1, price: 1 });
ProductSchema.index({ color: 1, sizes: 1 });

// Makes the ghost product cleanup query fast (used in cleanupStaleRuns)
ProductSchema.index({ lastSeenAt: 1, available: 1 });

// Makes the delta skip query fast (brand + department + updatedAt filter)
ProductSchema.index({ brand: 1, department: 1, updatedAt: 1 });

export const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);
