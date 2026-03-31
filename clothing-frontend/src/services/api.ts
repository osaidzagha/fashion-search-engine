import { FetchProductParams, PaginatedResponse, Product } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const fetchProductsFromAPI = async (
  filters: FetchProductParams,
): Promise<PaginatedResponse> => {
  try {
    const urlParams = new URLSearchParams();

    if (filters.searchTerm) urlParams.set("search", filters.searchTerm);
    if (filters.page) urlParams.set("page", filters.page.toString());

    if (filters.brands && filters.brands.length > 0) {
      urlParams.set("brand", filters.brands.join(","));
    }

    if (filters.departments && filters.departments.length > 0) {
      urlParams.set("category", filters.departments.join(","));
    }

    if (filters.maxPrice)
      urlParams.set("maxPrice", filters.maxPrice.toString());

    console.log(
      "Fetching URL:",
      `${BASE_URL}/api/products?${urlParams.toString()}`,
    );

    const response = await fetch(
      `${BASE_URL}/api/products?${urlParams.toString()}`,
    );
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
