import { useCompare, MAX_COMPARE } from "../context/CompareContext";

export function CompareBar() {
  const { compareList, removeFromCompare, openOverlay, clearCompare } =
    useCompare();

  if (compareList.length === 0) return null;

  // ✅ Need at least 2 to compare
  const canCompare = compareList.length >= 2;
  const remaining = MAX_COMPARE - compareList.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[800] bg-bgPrimary dark:bg-bgPrimary-dark border-t border-borderDark dark:border-borderDark-dark py-3 md:py-3.5 px-4 md:px-10 flex items-center justify-between gap-3 md:gap-6 animate-slide-up transition-colors duration-500 ease-smooth">
      {/* ── Left: label ── */}
      <div className="flex-shrink-0 flex items-center gap-3">
        {/* Mobile: compact slot previews */}
        <div className="flex items-center gap-2 lg:hidden">
          {Array.from({ length: MAX_COMPARE }).map((_, i) => {
            const product = compareList[i];
            return product ? (
              <button
                key={i}
                onClick={() => removeFromCompare(product.id)}
                aria-label={`Remove ${product.name}`}
                className="relative w-9 h-[46px] flex-shrink-0 overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark border border-borderDark dark:border-borderDark-dark group"
              >
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-bgHover dark:bg-bgHover-dark" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[10px] leading-none">×</span>
                </div>
              </button>
            ) : (
              <div
                key={i}
                className="w-9 h-[46px] flex-shrink-0 border border-dashed border-borderLight dark:border-borderLight-dark"
              />
            );
          })}
          <div className="ml-1">
            <p className="font-sans text-[7px] tracking-[0.22em] uppercase text-textMuted dark:text-textMuted-dark leading-none mb-0.5">
              Comparing
            </p>
            <p className="font-heading italic text-[11px] text-textSecondary dark:text-textSecondary-dark leading-none">
              {compareList.length} / {MAX_COMPARE}
            </p>
          </div>
        </div>

        {/* Desktop: label only */}
        <div className="hidden lg:block">
          <p className="font-sans text-[7px] md:text-[8px] tracking-[0.28em] uppercase text-textMuted dark:text-textMuted-dark mb-0.5">
            Comparing
          </p>
          <p className="font-heading italic text-xs md:text-sm text-textSecondary dark:text-textSecondary-dark">
            {compareList.length} / {MAX_COMPARE} selected
          </p>
        </div>
      </div>

      {/* ── Center: Product slots (desktop only) ── */}
      <div className="hidden lg:flex gap-2.5 flex-1 justify-center items-center">
        {Array.from({ length: MAX_COMPARE }).map((_, i) => {
          const product = compareList[i];
          const isLast = i === MAX_COMPARE - 1;
          return (
            <div key={i} className="flex items-center gap-2.5">
              {product ? (
                <ProductSlot
                  product={product}
                  onRemove={() => removeFromCompare(product.id)}
                />
              ) : (
                <EmptySlot label={`Add item ${i + 1}`} />
              )}
              {!isLast && (
                <span className="font-heading italic text-base text-borderLight dark:text-borderLight-dark flex-shrink-0 select-none">
                  vs
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <button
          onClick={clearCompare}
          aria-label="Clear all comparisons"
          className="font-sans text-[8px] md:text-[9px] tracking-[0.18em] uppercase text-textMuted dark:text-textMuted-dark bg-transparent border-none p-0 cursor-pointer transition-colors duration-200 hover:text-textPrimary dark:hover:text-textPrimary-dark"
        >
          Clear
        </button>

        <button
          onClick={openOverlay}
          disabled={!canCompare}
          aria-disabled={!canCompare}
          aria-label={
            canCompare
              ? "Open comparison overlay"
              : `Select ${2 - compareList.length} more item${2 - compareList.length !== 1 ? "s" : ""} to compare`
          }
          className={`font-sans text-[9px] md:text-[10px] tracking-[0.22em] uppercase font-medium border-none px-4 py-2 md:px-6 md:py-2.5 transition-all duration-200 ease-smooth ${
            canCompare
              ? "bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark cursor-pointer hover:opacity-90"
              : "bg-bgHover dark:bg-bgHover-dark text-textMuted dark:text-textMuted-dark cursor-not-allowed"
          }`}
        >
          {canCompare ? "Compare →" : `Add ${remaining} more`}
        </button>
      </div>
    </div>
  );
}

// ─── Product Slot ─────────────────────────────────────────────────────────────
function ProductSlot({
  product,
  onRemove,
}: {
  product: any;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 max-w-[200px] bg-bgSecondary dark:bg-bgSecondary-dark border border-borderDark dark:border-borderDark-dark py-1.5 pr-2.5 pl-1.5 animate-item-in transition-colors duration-300 ease-smooth">
      <div className="w-9 h-[46px] flex-shrink-0 overflow-hidden bg-bgHover dark:bg-bgHover-dark transition-colors duration-300">
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-sans text-[9px] tracking-[0.06em] text-textPrimary dark:text-textPrimary-dark mb-0.5 truncate max-w-[100px] transition-colors duration-300">
          {product.name
            .split(" ")
            .map(
              (w: string) =>
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
            )
            .join(" ")}
        </p>
        <p className="font-heading text-[13px] text-textMuted dark:text-textMuted-dark transition-colors duration-300">
          {product.price.toLocaleString("tr-TR")} {product.currency}
        </p>
      </div>

      <button
        onClick={onRemove}
        aria-label={`Remove ${product.name} from comparison`}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-borderDark dark:bg-borderLight-dark border-none cursor-pointer text-textMuted dark:text-textMuted-dark text-[10px] leading-none transition-colors duration-150 hover:bg-bgHover dark:hover:bg-bgHover-dark"
      >
        ×
      </button>
    </div>
  );
}

// ─── Empty Slot ───────────────────────────────────────────────────────────────
function EmptySlot({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center w-[180px] h-[58px] border border-dashed border-borderLight dark:border-borderLight-dark transition-colors duration-300">
      <p className="font-sans text-[8px] tracking-[0.2em] uppercase text-borderLight dark:text-borderLight-dark">
        {label}
      </p>
    </div>
  );
}
