import express, { Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ProductModel } from "./models/Product";
import productRoutes from "./routes/productRoutes";
import authRoutes from "./routes/authRoutes";
import watchlistRoutes from "./routes/watchlistRoutes";
import { startScraperCron } from "./scrapers/scheduler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);

// Database Connection
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(async () => {
    console.log("🔌 Connected to MongoDB");
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
