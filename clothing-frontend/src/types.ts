// ─── Media item (Massimo Dutti uses this structure) ───────────────────────────
export interface MediaItem {
  type: "image" | "video";
  url: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  brand: string;
  images: string[];

  // ─── VIDEO & MEDIA FIELDS (CRITICAL) ───
  video?: string; // Zara uses this
  videoUrl?: string;
  videos?: string[];
  media?: MediaItem[]; // Massimo Dutti uses this

  link: string;
  category: string;
  department?: string;
  color?: string;
  description?: string;
  composition?: string;
  sizes?: string[];
  timestamp?: string;
  lastSeenAt?: string;
  available?: boolean;          // false = OOS or delisted
  priceHistory?: { price: number; date: string }[];
  historyPreview?: { price: number; date: string }[];
  histMin?: number;
}

export interface PaginatedResponse {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  availableSizes?: string[];
  availableColors?: string[];
}

export interface FetchProductParams {
  searchTerm?: string; // optional — not all fetches are search-driven
  page?: number; // optional — defaults to 1 on the backend
  brands?: string[];
  departments?: string[];
  sizes?: string[];
  colors?: string[];
  maxPrice?: number;
  onSale?: boolean;
  sort?: string;
  mode?: string;
  hasVideo?: boolean;
  hideOOS?: boolean;            // when true, exclude available:false products
}
