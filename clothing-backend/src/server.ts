import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import watchlistRoutes from "./routes/watchlistRoutes";
import adminRoutes from "./routes/admin";
import { startScraperCron } from "./scrapers/scheduler";
import { priceAlertWorker } from "./queues/priceAlertWorker";
import { redisConnection } from "./queues/queues";
import { cleanupStaleRuns } from "./scrapers/scraperManager";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware FIRST ─────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// ── Rate limiting on auth routes ──────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests" },
});
app.use("/api/auth", authLimiter);

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/admin", adminRoutes);

// ── Global error handler LAST ─────────────────────────────────────
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// ── Database + server start ───────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(async () => {
    console.log("🔌 Connected to MongoDB");
    await cleanupStaleRuns();
    await mongoose.model("Product").syncIndexes();
    console.log("✅ Database indexes synchronized");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    startScraperCron();
    console.log("🔔 Price alert worker online.");
  })
  .catch((error) => {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  });

// ── Graceful shutdown ─────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  await priceAlertWorker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
