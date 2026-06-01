import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import watchlistRoutes from "./routes/watchlistRoutes";
import adminRoutes from "./routes/admin";
import { priceAlertWorker } from "./queues/priceAlertWorker";
import { redisConnection } from "./queues/queues";
import userRoutes from "./routes/userRoutes";
import { cleanupStaleRuns } from "./scrapers/scraperManager";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// 👇 IMPORT THE NEW ERROR HANDLER
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 8080;

// ── Security middleware FIRST ─────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:5173", // For your local development
      "http://localhost:3000",
      "https://dopewear.app", // Your new custom domain!
      "https://www.dopewear.app",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// ── Rate limiting on auth routes ──────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests" },
});
app.use("/api/auth", authLimiter);

// ── Rate limiting on scraper admin routes (prevents Puppeteer spam) ───────────
const scraperLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: "Too many scraper requests" },
});
app.use("/api/admin/scraper", scraperLimiter);

// ── Health check (MOVED ABOVE ERROR HANDLER) ──────────────────────
app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Fashion backend is running 🚀",
  });
});

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);

// ── Global error handler (MUST BE ABSOLUTE LAST) ──────────────────
app.use(errorHandler);

// ── Database + server start ───────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(async () => {
    console.log("🔌 Connected to MongoDB");
    await cleanupStaleRuns();
    await mongoose.model("Product").syncIndexes();
    console.log("✅ Database indexes synchronized");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

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
