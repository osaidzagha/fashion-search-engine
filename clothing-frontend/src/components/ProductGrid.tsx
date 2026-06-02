import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  /** First index of the newly-fetched batch.
   *  Items before this index are already visible — render with no animation.
   *  Items from this index onward get a CSS fade-in stagger.
   *  Defaults to 0 (animate all items, used on page-1 load + filter reset). */
  newItemsStart?: number;
}

// Returns the Tailwind col/row span class for the editorial magazine layout.
// The pattern repeats every 10 items.
function getGridClass(index: number): string {
  const pos = index % 10;
  if (pos === 0 || pos === 7)
    return "col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2";
  return "col-span-1";
}

const gridWrapperClasses =
  "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 md:gap-x-6 gap-y-6 md:gap-y-16 grid-flow-row-dense transition-colors duration-500 ease-smooth";

export const ProductGrid = ({
  products,
  isLoading,
  newItemsStart = 0,
}: ProductGridProps) => {
  // ── 1. LOADING STATE ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={gridWrapperClasses}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`skeleton-${i}`} className={getGridClass(i)}>
            <ProductSkeleton isCardMode={false} />
          </div>
        ))}
      </div>
    );
  }

  // ── 2. EMPTY STATE ────────────────────────────────────────────────────────
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

  // ── 3. PRODUCTS ───────────────────────────────────────────────────────────
  // We use plain CSS animations instead of framer-motion whileInView because:
  //   • whileInView starts at opacity:0 and only fires when in viewport — the
  //     whole grid is black until it scrolls into view, and on re-renders the
  //     animation resets, causing the "black page" bug.
  //   • CSS animation fires immediately on mount, regardless of scroll position.
  //
  // Items before newItemsStart are already visible — no animation (opacity: 1).
  // Items from newItemsStart onward get a staggered fade-in-up.
  return (
    <div className={gridWrapperClasses}>
      {products.map((product, index) => {
        const isNew = index >= newItemsStart;
        // Stagger new items by 40ms each, capped so the last card isn't too delayed
        const staggerDelay = isNew
          ? `${Math.min((index - newItemsStart) * 0.04, 0.6)}s`
          : "0s";

        return (
          <div
            key={product.id}
            className={getGridClass(index)}
            style={
              isNew
                ? {
                    animation: "fadeIn 0.5s cubic-bezier(0.22,1,0.36,1) both",
                    animationDelay: staggerDelay,
                  }
                : undefined
            }
          >
            <ProductCard product={product} />
          </div>
        );
      })}
    </div>
  );
};
