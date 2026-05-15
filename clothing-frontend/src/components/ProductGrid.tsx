import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";
import { AnimatedGrid, AnimatedGridItem } from "./AnimatedGrid";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export const ProductGrid = ({ products, isLoading }: ProductGridProps) => {
  // ── THE EDITORIAL ALGORITHM ──
  // Creates a perfectly balanced, repeating 10-item magazine spread.
  const getGridClass = (index: number) => {
    const position = index % 10;

    // ✅ FIX: Stays 1 column on mobile, expands to 2 on md/lg screens
    if (position === 0)
      return "col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2";
    if (position === 7)
      return "col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2";

    // Standard card
    return "col-span-1";
  };

  // ✅ FIX: Tighter gap on mobile (gap-x-3 gap-y-6), wider on desktop
  const gridWrapperClasses =
    "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 md:gap-x-6 gap-y-6 md:gap-y-16 grid-flow-row-dense transition-colors duration-500 ease-smooth";

  // ── 1. THE LOADING STATE ──
  if (isLoading) {
    return (
      <div className={gridWrapperClasses}>
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={`skeleton-${index}`} className={getGridClass(index)}>
            <ProductSkeleton isCardMode={false} />
          </div>
        ))}
      </div>
    );
  }

  // ── 2. EMPTY STATE ──
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-32 w-full animate-fade-in">
        <p className="font-heading italic text-xl md:text-2xl text-textSecondary dark:text-textSecondary-dark">
          No items found
        </p>
        <p className="font-sans text-[10px] tracking-widest uppercase text-textMuted mt-2">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  // ── 3. THE LOADED STATE ──
  return (
    <AnimatedGrid className={gridWrapperClasses}>
      {products.map((product, index) => (
        <AnimatedGridItem key={product.id} className={getGridClass(index)}>
          <ProductCard product={product} />
        </AnimatedGridItem>
      ))}
    </AnimatedGrid>
  );
};
