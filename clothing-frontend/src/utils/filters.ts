import { Product } from "../types";

// This function takes the raw array and the search term, and returns the filtered array.
export const filterProductsByName = (
  products: Product[],
  searchTerm: string,
): Product[] => {
  if (!searchTerm) return products;

  // Otherwise, run your exact logic:
  return products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
};
