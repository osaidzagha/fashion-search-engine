import express, { Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ProductModel } from "./models/Product";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// We tell Express: "When a GET request hits /api/products, run this async function"
app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const allProducts = await ProductModel.find({});

    // TODO 2: Send the 'allProducts' array back to the frontend.
    // Hint: Use the 'res' object. Set the status code to 200 (OK), and chain the .json() method to send the data.
    /* Your Response code here! */ res.status(200).json(allProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    // If something breaks, we send a 500 (Internal Server Error) back to the frontend
    res.status(500).json({ message: "Server Error fetching products" });
  }
});

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("🔌 Connected to MongoDB");

    // Once the DB is connected, we open the front door for network traffic!
    app.listen(PORT, () => {
      console.log(`🚀 API Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("❌ Failed to connect to MongoDB.");
    console.error(error);
    process.exit(1);
  });
