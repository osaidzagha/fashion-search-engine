export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number; // ← add
  currency: string;
  brand: string;
  images: string[];
  video?: string; // ← add
  link: string;
  category: string;
  department?: string; // ← add
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
}
export interface FetchProductParams {
  searchTerm: string;
  page: number;
  brands?: string[];
  departments?: string[];
  maxPrice?: number;
}
