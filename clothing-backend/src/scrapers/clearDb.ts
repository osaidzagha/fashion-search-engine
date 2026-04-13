import mongoose from "mongoose";
import dotenv from "dotenv";
import { ProductModel } from "../models/Product"; // Adjust this path if your model is somewhere else!

dotenv.config();

const clearMassimoDutti = async () => {
  try {
    // 1. Connect to the database
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing in .env file.");
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to MongoDB.");

    // 2. Nuke ONLY the Massimo Dutti products (Leave Zara alone!)
    console.log("🗑️  Deleting old Massimo Dutti data...");
    const result = await ProductModel.deleteMany({ brand: "Massimo Dutti" });

    console.log(
      `✅ Successfully deleted ${result.deletedCount} Massimo Dutti products.`,
    );

    // 3. Disconnect and close the script
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  }
};

clearMassimoDutti();
