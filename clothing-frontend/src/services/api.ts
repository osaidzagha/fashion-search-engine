import { FetchProductParams, PaginatedResponse, Product } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const AUTH_URL = `${BASE_URL}/api/auth`;

// ─── Custom Error Class ───────────────────────────────────────────────────────
export class ApiError extends Error {
  public status: number;
  public validationErrors?: { field: string; message: string }[];

  constructor(message: string, status: number, errors?: any[]) {
    super(message);
    this.status = status;
    this.validationErrors = errors;
  }
}

// ─── Global Fetch Interceptor ─────────────────────────────────────────────────
async function globalFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("auth-expired"));
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  if (!response.ok) {
    let errorMessage = "An unexpected error occurred";
    let errorsArray = [];
    try {
      const data = await response.json();
      errorMessage = data.message || errorMessage;
      errorsArray = data.errors || [];
    } catch {
      errorMessage = `Server Error (${response.status})`;
    }
    throw new ApiError(errorMessage, response.status, errorsArray);
  }

  return response;
}

// ─── Featured Data Types ──────────────────────────────────────────────────────

export interface CategoryTiles {
  coats: Product | null;
  jackets: Product | null;
  suits: Product | null;
  tops: Product | null;
  knitwear: Product | null;
  jeans: Product | null;
  trousers: Product | null;
  shorts: Product | null;
  dresses: Product | null;
  skirts: Product | null;
  activewear: Product | null;
  jumpsuits: Product | null;
  shoes: Product | null;
  bags: Product | null;
  accessories: Product | null;
  jewelry: Product | null;
}

export interface FeaturedData {
  onSale: Product[];
  newIn: Product[];
  withVideo: Product[];
  campaignHeroes: Product[];
  categoryTiles: CategoryTiles;
}

export interface BrandCounts {
  zara: number;
  mango: number;
  massimoDutti: number;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const fetchProductsFromAPI = async (
  filters: FetchProductParams,
): Promise<PaginatedResponse> => {
  try {
    const urlParams = new URLSearchParams();

    if (filters.searchTerm) urlParams.set("search", filters.searchTerm);
    if (filters.page) urlParams.set("page", filters.page.toString());
    if (filters.brands?.length)
      urlParams.set("brand", filters.brands.join(","));
    if (filters.departments?.length)
      urlParams.set("departments", filters.departments.join(","));
    if (filters.maxPrice)
      urlParams.set("maxPrice", filters.maxPrice.toString());
    if (filters.sizes?.length) urlParams.set("sizes", filters.sizes.join(","));
    if (filters.colors?.length)
      urlParams.set("colors", filters.colors.join(","));
    if (filters.onSale) urlParams.set("onSale", "true");
    if (filters.sort) urlParams.set("sort", filters.sort);
    if (filters.mode) urlParams.set("mode", filters.mode);
    if (filters.hasVideo) urlParams.set("hasVideo", "true");
    if (filters.hideOOS) urlParams.set("hideOOS", "true");

    const response = await globalFetch(
      `${BASE_URL}/api/products?${urlParams.toString()}`,
    );
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return { products: [], totalCount: 0, totalPages: 0, currentPage: 1 };
  }
};

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const response = await globalFetch(`${BASE_URL}/api/products/${id}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return null;
  }
}

export async function fetchRelatedProducts(id: string): Promise<Product[]> {
  try {
    const response = await globalFetch(
      `${BASE_URL}/api/products/${id}/related`,
    );
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch related products:", error);
    return [];
  }
}

// ─── Featured ─────────────────────────────────────────────────────────────────

/**
 * Fetches the homepage featured payload — campaign heroes, sale products,
 * new-in items, video products, and one representative product per category
 * tile. The backend is expected to populate all 16 categoryTiles keys; any
 * key it doesn't recognise will come back as null and the UI will hide that
 * tile automatically.
 */
export async function fetchFeatured(
  departments?: string[],
): Promise<FeaturedData | null> {
  try {
    const params = new URLSearchParams();
    if (departments?.length) params.set("departments", departments.join(","));

    const response = await globalFetch(
      `${BASE_URL}/api/products/featured?${params.toString()}`,
    );
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch featured data:", error);
    return null;
  }
}

/**
 * Fetches item counts for all three brands in parallel.
 * Uses limit=1 so the backend does minimal work — we only need totalCount.
 * Resolves to zeros on any failure so the UI degrades gracefully.
 */
export async function fetchBrandCounts(
  departments?: string[],
): Promise<BrandCounts> {
  const deptParam = departments?.length
    ? `&departments=${departments.join(",")}`
    : "";

  const get = async (brand: string): Promise<number> => {
    try {
      const res = await globalFetch(
        `${BASE_URL}/api/products?brand=${encodeURIComponent(brand)}&limit=1${deptParam}`,
      );
      const data = await res.json();
      return data.totalCount ?? 0;
    } catch {
      return 0;
    }
  };

  const [zara, mango, massimoDutti] = await Promise.all([
    get("Zara"),
    get("Mango"),
    get("Massimo Dutti"),
  ]);

  return { zara, mango, massimoDutti };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginUser = async (credentials: {
  email: string;
  password: string;
}) => {
  const response = await globalFetch(`${AUTH_URL}/login`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return await response.json();
};

export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
}) => {
  const response = await globalFetch(`${AUTH_URL}/register`, {
    method: "POST",
    body: JSON.stringify(userData),
  });
  return await response.json();
};

export const verifyOTP = async (verifyData: { email: string; otp: string }) => {
  const response = await globalFetch(`${AUTH_URL}/verify`, {
    method: "POST",
    body: JSON.stringify(verifyData),
  });
  return await response.json();
};

// ─── Watchlist ────────────────────────────────────────────────────────────────

export const fetchWatchlist = async (): Promise<Product[]> => {
  try {
    const response = await globalFetch(`${BASE_URL}/api/watchlist`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch watchlist:", error);
    return [];
  }
};

export const addToWatchlist = async (
  productId: string,
  targetPrice?: number,
): Promise<boolean> => {
  try {
    await globalFetch(`${BASE_URL}/api/watchlist/${productId}`, {
      method: "POST",
      body: JSON.stringify(targetPrice ? { targetPrice } : {}),
    });
    return true;
  } catch (error) {
    console.error("Failed to add to watchlist:", error);
    return false;
  }
};

export const removeFromWatchlist = async (
  productId: string,
): Promise<boolean> => {
  try {
    await globalFetch(`${BASE_URL}/api/watchlist/${productId}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Failed to remove from watchlist:", error);
    return false;
  }
};

/** Update the target price on an already-tracked item.
 *  Internally uses the same POST endpoint — the backend updates in-place
 *  when the item already exists and a targetPrice is provided. */
export const updateWatchlistTarget = async (
  productId: string,
  targetPrice: number,
): Promise<boolean> => {
  try {
    await globalFetch(`${BASE_URL}/api/watchlist/${productId}`, {
      method: "POST",
      body: JSON.stringify({ targetPrice }),
    });
    return true;
  } catch (error) {
    console.error("Failed to update target price:", error);
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
    const response = await globalFetch(`${BASE_URL}/api/categories`);
    return await response.json();
  } catch (error) {
    console.error("Categories API error:", error);
    return [];
  }
};

export const toggleCampaignHeroAPI = async (productId: string) => {
  const response = await globalFetch(
    `${BASE_URL}/api/admin/products/${productId}/campaign`,
    { method: "PUT" },
  );
  return await response.json();
};

export async function fetchTrendingProducts(
  departments?: string[],
): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (departments?.length) params.set("departments", departments.join(","));
    const response = await globalFetch(
      `${BASE_URL}/api/products/trending?${params.toString()}`,
    );
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch trending products:", error);
    return [];
  }
}
