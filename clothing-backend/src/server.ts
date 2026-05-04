import "dotenv/config"; // 🚨 MUST BE THE ABSOLUTE FIRST LINE
import express, { Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import { ProductModel } from "./models/Product";
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import watchlistRoutes from "./routes/watchlistRoutes";
import { startScraperCron } from "./scrapers/scheduler";
import { priceAlertWorker } from "./queues/priceAlertWorker";
import { redisConnection } from "./queues/queues";
import adminRoutes from "./routes/admin";
import { cleanupStaleRuns } from "./scrapers/scraperManager";
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/admin", adminRoutes);

// Database Connection
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(async () => {
    console.log("🔌 Connected to MongoDB");
    await cleanupStaleRuns();
    await mongoose.model("Product").syncIndexes();
    console.log("✅ Database Indexes Synchronized!");

    app.listen(PORT, () => {
      console.log(`🚀 API Server is running on http://localhost:${PORT}`);
    });

    // 👇 Only start the cron job AFTER we know the database is successfully connected
    startScraperCron();
  })
  .catch((error) => {
    console.log("❌ Failed to connect to MongoDB.");
    console.error(error);
    process.exit(1);
  });
console.log("🔔 Price alert worker online.");

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  await priceAlertWorker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
