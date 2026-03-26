import { PaginatedResponse, Product } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const fetchProductsFromAPI = async (
  search?: string,
  page?: number,
): Promise<PaginatedResponse> => {
  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (page) params.set("page", page.toString());
    const response = await fetch(`${BASE_URL}/api/products?${params}`);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return { products: [], totalCount: 0, totalPages: 0, currentPage: 1 };
  }
};

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/products/${id}`);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return null;
  }
}
