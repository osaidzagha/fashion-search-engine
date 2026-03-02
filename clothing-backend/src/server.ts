import express, { Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ProductModel } from "./models/Product";
import productRoutes from "./routes/productRoutes";
import { runAllScrapers } from "./index";
import cron from "node-cron";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Use the product routes for any requests to /api/products
app.use("/api/products", productRoutes);

// Test schedule: Run every 1 minute
cron.schedule("* 3 * * *", async () => {
  console.log("⏰ Cron triggered! Waking up the Foreman...");
  await runAllScrapers();
});
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("🔌 Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 API Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("❌ Failed to connect to MongoDB.");
    console.error(error);
    process.exit(1);
  });
