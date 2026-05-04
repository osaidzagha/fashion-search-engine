export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  brand: string;
  images: string[];

  // ─── VIDEO & MEDIA FIELDS (CRITICAL) ───
  video?: string; // Zara uses this!
  videoUrl?: string;
  videos?: string[];
  media?: any[]; // Massimo often uses this!

  link: string;
  category: string;
  department?: string;
  color?: string;
  description?: string;
  composition?: string;
  sizes?: string[];
  timestamp?: string;
  priceHistory?: { price: number; date: string }[];
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
  searchTerm: string;
  page: number;
  brands?: string[];
  departments?: string[];
  sizes?: string[];
  colors?: string[];
  maxPrice?: number;
  onSale?: boolean;
}
