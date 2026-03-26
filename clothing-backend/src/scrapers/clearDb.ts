import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ProductModel } from "../models/Product";

async function clearDatabase() {
  dotenv.config();
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("✅ Connected to DB\n");
    const result = await ProductModel.deleteMany({});
    console.log(
      `🧹 Cleared Database! Deleted ${result.deletedCount} products.`,
    );
  } catch (error) {
    console.error("❌ Error clearing DB:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n💤 Disconnected.");
  }
}

clearDatabase();
