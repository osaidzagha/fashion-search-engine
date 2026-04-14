import mongoose from "mongoose";
import dotenv from "dotenv";
import { ProductModel } from "../models/Product";

dotenv.config();

const clearDatabase = async () => {
  try {
    // 1. Connect to the database
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing in .env file.");
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to MongoDB.");

    // 2. The Nuclear Option: Drop the entire collection AND its indexes
    console.log("🗑️  Dropping the entire products collection...");

    try {
      await ProductModel.collection.drop();
      console.log(
        "✅ Successfully destroyed the collection. Your database is a clean slate.",
      );
    } catch (dropError: any) {
      // If Mongo throws Error Code 26, it just means the collection is already gone
      if (dropError.code === 26) {
        console.log("⚠️ Collection doesn't exist, nothing to drop.");
      } else {
        throw dropError;
      }
    }

    // 3. Disconnect and close the script
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  }
};

clearDatabase();
