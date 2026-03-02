import express from "express";
import { getProducts } from "../controllers/productController";

const router = express.Router();

// Define the route for fetching products
router.get("/", getProducts);

export default router;
