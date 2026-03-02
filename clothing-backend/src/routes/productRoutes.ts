import express from "express";
import { getProducts } from "../controllers/productController";
import { getProductById } from "../controllers/productController";

const router = express.Router();

// Define the route for fetching products
router.get("/", getProducts);
router.get("/:id", getProductById);
export default router;
