import { FetchProductParams, PaginatedResponse, Product } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const AUTH_URL = `${BASE_URL}/api/auth`;

// ─── Helper: authenticated fetch ─────────────────────────────────────────────
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
    if (filters.sizes && filters.sizes.length > 0)
      urlParams.set("sizes", filters.sizes.join(","));
    if (filters.colors && filters.colors.length > 0)
      urlParams.set("colors", filters.colors.join(","));
    if (filters.onSale) urlParams.set("onSale", "true");
    if (filters.sort) urlParams.set("sort", filters.sort);
    if (filters.mode) urlParams.set("mode", filters.mode);

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

export async function fetchRelatedProducts(id: string): Promise<Product[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/products/${id}/related`);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch related products:", error);
    return [];
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginUser = async (credentials: {
  email: string;
  password: string;
}) => {
  const response = await fetch(`${AUTH_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  // ✅ SAFE ERROR HANDLING
  if (!response.ok) {
    let errorMsg = "Login failed";
    try {
      const data = await response.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      errorMsg = `Server Error (${response.status}). The server might be waking up.`;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
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

  // ✅ SAFE ERROR HANDLING: Prevents "stuck on loading"
  if (!response.ok) {
    let errorMsg = "Registration failed";
    try {
      const data = await response.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      errorMsg = `Server error (${response.status}). Please try again in 1 minute.`;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
};

// ✅ NEW: Added for OTP verification
export const verifyOTP = async (verifyData: { email: string; otp: string }) => {
  const response = await fetch(`${AUTH_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(verifyData),
  });

  if (!response.ok) {
    let errorMsg = "Verification failed";
    try {
      const data = await response.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      errorMsg = "Server error during verification.";
    }
    throw new Error(errorMsg);
  }

  return await response.json();
};

// ─── Watchlist ────────────────────────────────────────────────────────────────

export const fetchWatchlist = async (): Promise<Product[]> => {
  try {
    const response = await authFetch(`${BASE_URL}/api/watchlist`);
    if (response.status === 401) return [];
    if (!response.ok) throw new Error("Failed to fetch watchlist");
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch watchlist:", error);
    return [];
  }
};

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

export const checkIsTracked = async (productId: string): Promise<boolean> => {
  try {
    const watchlist = await fetchWatchlist();
    return watchlist.some((p: any) => p.id === productId);
  } catch {
    return false;
  }
};

export const fetchCategories = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/categories`);
    if (!response.ok) throw new Error("Failed to fetch categories");
    return await response.json();
  } catch (error) {
    console.error("Categories API error:", error);
    return [];
  }
};

export const toggleCampaignHeroAPI = async (productId: string) => {
  const response = await authFetch(
    `${BASE_URL}/api/admin/products/${productId}/campaign`,
    {
      method: "PUT",
    },
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "Failed to update campaign status");
  }
  return await response.json();
};
