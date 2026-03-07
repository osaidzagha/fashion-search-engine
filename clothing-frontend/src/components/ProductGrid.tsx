import { Product } from "../types";
import { ProductCard } from "./ProductCard";

// 2. Define the Props (This component expects an ARRAY of products)
interface ProductGridProps {
  products: Product[];
}

// 3. The Component
export const ProductGrid = ({ products }: ProductGridProps) => {
  if (products.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 text-lg">
          No products found. Adjust your filters!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.link} product={product} />
      ))}
    </div>
  );
};
