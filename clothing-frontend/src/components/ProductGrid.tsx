import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export const ProductGrid = ({ products, isLoading }: ProductGridProps) => {
  // ── THE EDITORIAL ALGORITHM ──
  // Creates a perfectly balanced, repeating 10-item magazine spread.
  const getGridClass = (index: number) => {
    const position = index % 10;

    // Huge spread on the LEFT
    if (position === 0) return "lg:col-span-2 lg:row-span-2 col-span-1";

    // Huge spread on the RIGHT
    if (position === 7) return "lg:col-span-2 lg:row-span-2 col-span-1";

    // Standard card
    return "col-span-1";
  };

  // ── 1. THE LOADING STATE ──
  if (isLoading) {
    return (
      // 👇 Added 'grid-flow-row-dense' so CSS automatically fills any blank gaps!
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 grid-flow-row-dense">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={`skeleton-${index}`} className={getGridClass(index)}>
            <ProductSkeleton isCardMode={false} />
          </div>
        ))}
      </div>
    );
  }

  // ── 2. THE LOADED STATE ──
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 grid-flow-row-dense">
      {products.map((product, index) => (
        <div key={product.link || product.id} className={getGridClass(index)}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
};
