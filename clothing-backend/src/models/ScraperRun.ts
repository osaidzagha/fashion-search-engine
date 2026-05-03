import mongoose, { Document, Schema } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IScraperRun extends Document {
  brand: string;
  status: "running" | "success" | "error";
  newItems: number;
  updatedItems: number;
  errorCount: number;
  /** Wall-clock duration in milliseconds. 0 while still running. */
  durationMs: number;
  startedAt: Date;
  completedAt?: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ScraperRunSchema = new Schema<IScraperRun>(
  {
    brand: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["running", "success", "error"],
      required: true,
    },
    newItems: { type: Number, default: 0 },
    updatedItems: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    startedAt: { type: Date, required: true, index: true },
    completedAt: { type: Date },
  },
  {
    // Disable the default `updatedAt` — we track timing ourselves
    timestamps: false,
    collection: "scraperruns",
  },
);

// Compound index so "latest run per brand" queries are fast
ScraperRunSchema.index({ brand: 1, startedAt: -1 });

export const ScraperRunModel = mongoose.model<IScraperRun>(
  "ScraperRun",
  ScraperRunSchema,
);
