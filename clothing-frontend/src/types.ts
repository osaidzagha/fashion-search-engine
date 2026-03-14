export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  brand: string;
  imageUrl: string;
  link: string;
}
export interface PaginatedResponse {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}
