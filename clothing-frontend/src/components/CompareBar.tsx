import { useCompare } from "../context/CompareContext";

export function CompareBar() {
  const { compareList, removeFromCompare, openOverlay, clearCompare } =
    useCompare();

  if (compareList.length === 0) return null;

  const canCompare = compareList.length === 2;

  return (
    <div
      className="
        fixed bottom-0 left-0 right-0 z-[800]
        bg-bgPrimary dark:bg-bgPrimary-dark
        border-t border-borderDark dark:border-borderDark-dark
        py-3 md:py-3.5 px-4 md:px-10
        flex items-center justify-between gap-4 md:gap-6
        animate-slide-up
        transition-colors duration-500 ease-smooth
      "
    >
      {/* ── Left: Label ── */}
      <div className="flex-shrink-0">
        <p className="font-sans text-[7px] md:text-[8px] tracking-[0.28em] uppercase text-textMuted dark:text-textMuted-dark mb-0.5">
          Comparing
        </p>
        <p className="font-heading italic text-xs md:text-sm text-textSecondary dark:text-textSecondary-dark">
          {compareList.length} / 2{" "}
          <span className="hidden sm:inline">selected</span>
        </p>
      </div>

      {/* ── Center: Product Slots (Hidden on mobile to save space) ── */}
      <div className="hidden lg:flex gap-2.5 flex-1 justify-center items-center">
        {compareList[0] ? (
          <ProductSlot
            product={compareList[0]}
            onRemove={() => removeFromCompare(compareList[0].id)}
          />
        ) : (
          <EmptySlot label="Add first item" />
        )}

        <span className="font-heading italic text-base text-borderLight dark:text-borderLight-dark flex-shrink-0 select-none">
          vs
        </span>

        {compareList[1] ? (
          <ProductSlot
            product={compareList[1]}
            onRemove={() => removeFromCompare(compareList[1].id)}
          />
        ) : (
          <EmptySlot label="Add second item" />
        )}
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-3 md:gap-3 flex-shrink-0">
        <button
          onClick={clearCompare}
          aria-label="Clear all comparisons"
          className="
            font-sans text-[8px] md:text-[9px] tracking-[0.18em] uppercase
            text-textMuted dark:text-textMuted-dark
            bg-transparent border-none p-0 cursor-pointer
            transition-colors duration-200 ease-smooth
            hover:text-textPrimary dark:hover:text-textPrimary-dark
          "
        >
          Clear
        </button>

        <button
          onClick={openOverlay}
          disabled={!canCompare}
          aria-disabled={!canCompare}
          aria-label={
            canCompare ? "Open comparison overlay" : "Select 2 items to compare"
          }
          className={`
            font-sans text-[9px] md:text-[10px] tracking-[0.22em] uppercase font-medium
            border-none px-4 py-2 md:px-6 md:py-2.5
            transition-all duration-200 ease-smooth
            ${
              canCompare
                ? `bg-textPrimary dark:bg-textPrimary-dark
                   text-bgPrimary dark:text-bgPrimary-dark
                   cursor-pointer hover:opacity-90`
                : `bg-bgHover dark:bg-bgHover-dark
                   text-textMuted dark:text-textMuted-dark
                   cursor-not-allowed`
            }
          `}
        >
          Compare →
        </button>
      </div>
    </div>
  );
}

// ── Product Slot ──────────────────────────────────────────────────────────────
function ProductSlot({
  product,
  onRemove,
}: {
  product: any;
  onRemove: () => void;
}) {
  return (
    <div
      className="
        flex items-center gap-2.5 max-w-[220px]
        bg-bgSecondary dark:bg-bgSecondary-dark
        border border-borderDark dark:border-borderDark-dark
        py-1.5 pr-2.5 pl-1.5
        animate-item-in
        transition-colors duration-300 ease-smooth
      "
    >
      <div className="w-9 h-[46px] flex-shrink-0 overflow-hidden bg-bgHover dark:bg-bgHover-dark transition-colors duration-300 ease-smooth">
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-sans text-[9px] tracking-[0.06em] text-textPrimary dark:text-textPrimary-dark mb-0.5 truncate max-w-[120px] transition-colors duration-300 ease-smooth">
          {product.name
            .split(" ")
            .map(
              (w: string) =>
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
            )
            .join(" ")}
        </p>
        <p className="font-heading text-[13px] text-textMuted dark:text-textMuted-dark transition-colors duration-300 ease-smooth">
          {product.price.toLocaleString("tr-TR")} {product.currency}
        </p>
      </div>

      <button
        onClick={onRemove}
        aria-label={`Remove ${product.name} from comparison`}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-borderDark dark:bg-borderLight-dark border-none cursor-pointer text-textMuted dark:text-textMuted-dark text-[10px] leading-none transition-colors duration-150 ease-smooth hover:bg-bgHover dark:hover:bg-bgHover-dark"
      >
        ×
      </button>
    </div>
  );
}

// ── Empty Slot ────────────────────────────────────────────────────────────────
function EmptySlot({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center w-[200px] h-[58px] border border-dashed border-borderLight dark:border-borderLight-dark transition-colors duration-300 ease-smooth">
      <p className="font-sans text-[8px] tracking-[0.2em] uppercase text-borderLight dark:text-borderLight-dark">
        {label}
      </p>
    </div>
  );
}
