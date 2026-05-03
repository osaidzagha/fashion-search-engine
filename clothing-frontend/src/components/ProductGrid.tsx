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

    // Huge spread on the LEFT (Index 0, 10, 20...)
    if (position === 0) return "lg:col-span-2 lg:row-span-2 col-span-2";

    // Huge spread on the RIGHT (Index 7, 17, 27...)
    if (position === 7) return "lg:col-span-2 lg:row-span-2 col-span-2";

    // Standard card
    return "col-span-1";
  };

  // Common Grid Wrapper Classes
  const gridWrapperClasses =
    "grid grid-cols-2 lg:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-10 md:gap-y-16 grid-flow-row-dense transition-colors duration-500 ease-smooth";

  // ── 1. THE LOADING STATE ──
  if (isLoading) {
    return (
      <div className={gridWrapperClasses}>
        {/* We render exactly 10 to match our magazine pattern loop */}
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
      <div className="flex flex-col items-center justify-center py-32 w-full animate-fade-in">
        <p className="font-heading italic text-2xl text-textSecondary dark:text-textSecondary-dark">
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
    <div className={gridWrapperClasses}>
      {products.map((product, index) => (
        <div
          key={product.id}
          className={`animate-fade-in ${getGridClass(index)}`}
          // Optional: stagger the animation delay slightly for a premium reveal
          style={{ animationDelay: `${(index % 10) * 0.05}s` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
};
