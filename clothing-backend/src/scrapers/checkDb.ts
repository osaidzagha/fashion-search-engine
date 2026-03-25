import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ProductModel } from "../models/Product";

async function checkDatabase() {
  dotenv.config();

  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("✅ Connected to DB\n");

    const total = await ProductModel.countDocuments();
    const zaraCount = await ProductModel.countDocuments({ brand: "Zara" });
    const mdCount = await ProductModel.countDocuments({
      brand: "Massimo Dutti",
    });

    console.log(`📊 TOTAL PRODUCTS: ${total}`);
    console.log(`👗 Zara: ${zaraCount}`);
    console.log(`👔 Massimo Dutti: ${mdCount}\n`);

    const zaraSample = await ProductModel.findOne({ brand: "Zara" });
    if (zaraSample) {
      console.log("👗 ZARA DATA QUALITY CHECK:");
      console.dir(zaraSample.toObject(), { depth: null, colors: true });
    }

    const mdSample = await ProductModel.findOne({ brand: "Massimo Dutti" });
    if (mdSample) {
      console.log("\n👔 MASSIMO DUTTI DATA QUALITY CHECK:");
      console.dir(mdSample.toObject(), { depth: null, colors: true });
    }
  } catch (error) {
    console.error("❌ Error checking DB:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n💤 Disconnected.");
  }
}

checkDatabase();
