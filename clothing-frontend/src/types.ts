export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  brand: string;
  images: string[];
  link: string;
  category: string;
  color?: string;
  description?: string;
  composition?: string;
  sizes?: string[];
  timestamp?: string; // Or Date, depending on how your API sends it
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
