import { Product } from "../types";

// This function's ONLY job is to talk to the backend and return the array.
export const fetchProductsFromAPI = async (): Promise<Product[]> => {
  try {
    const response = await fetch("http://localhost:5000/api/products");
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return []; // Return an empty array if it fails so the app doesn't crash!
  }
};
