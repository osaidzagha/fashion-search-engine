import { FetchProductParams, PaginatedResponse, Product } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Helper: authenticated fetch ─────────────────────────────────────────────
// Reads the token from localStorage and adds it to every request that needs auth.
function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const fetchProductsFromAPI = async (
  filters: FetchProductParams,
): Promise<PaginatedResponse> => {
  try {
    const urlParams = new URLSearchParams();

    if (filters.searchTerm) urlParams.set("search", filters.searchTerm);
    if (filters.page) urlParams.set("page", filters.page.toString());
    if (filters.brands && filters.brands.length > 0)
      urlParams.set("brand", filters.brands.join(","));
    if (filters.departments && filters.departments.length > 0)
      urlParams.set("departments", filters.departments.join(","));
    if (filters.maxPrice)
      urlParams.set("maxPrice", filters.maxPrice.toString());

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

// ─── Auth ─────────────────────────────────────────────────────────────────────

const AUTH_URL = `${BASE_URL}/api/auth`;

export const loginUser = async (credentials: {
  email: string;
  password: string;
}) => {
  const response = await fetch(`${AUTH_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to login");
  return data;
};

export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
}) => {
  const response = await fetch(`${AUTH_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to register");
  return data;
};

// ─── Watchlist ────────────────────────────────────────────────────────────────

// GET /api/watchlist — fetch all tracked products for the logged-in user
export const fetchWatchlist = async (): Promise<Product[]> => {
  try {
    const response = await authFetch(`${BASE_URL}/api/watchlist`);
    if (response.status === 401) return []; // not logged in
    if (!response.ok) throw new Error("Failed to fetch watchlist");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch watchlist:", error);
    return [];
  }
};

// POST /api/watchlist/:productId — start tracking a product
export const addToWatchlist = async (productId: string): Promise<boolean> => {
  try {
    const response = await authFetch(`${BASE_URL}/api/watchlist/${productId}`, {
      method: "POST",
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to add to watchlist:", error);
    return false;
  }
};

// DELETE /api/watchlist/:productId — stop tracking a product
export const removeFromWatchlist = async (
  productId: string,
): Promise<boolean> => {
  try {
    const response = await authFetch(`${BASE_URL}/api/watchlist/${productId}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to remove from watchlist:", error);
    return false;
  }
};

// Check if a specific product is in the user's watchlist
export const checkIsTracked = async (productId: string): Promise<boolean> => {
  try {
    const watchlist = await fetchWatchlist();
    return watchlist.some((p) => p.id === productId);
  } catch {
    return false;
  }
};
