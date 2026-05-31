import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import { Product } from "../types";
import PriceHistoryChart from "./PriceHistoryChart";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function discountPct(original: number, current: number) {
  return Math.round(((original - current) / original) * 100);
}

// ─── Stat row — works for 2 or 3 products ────────────────────────────────────
function StatRow({
  label,
  values,
  winnerIndex,
  delay,
}: {
  label: string;
  values: React.ReactNode[];
  winnerIndex: number | null; // index of the winning product, or null for tie/n/a
  delay: number;
}) {
  return (
    <div
      className="grid items-center gap-0 py-3 md:py-4 border-b border-bgSecondary dark:border-bgSecondary-dark"
      style={{
        gridTemplateColumns: `repeat(${values.length}, 1fr) auto`,
        animation: `cov-rowIn 0.5s ease ${delay}s both`,
      }}
    >
      {/* Center label — rendered first in DOM but placed via CSS */}
      <div
        className="px-2 md:px-4 text-center border-x border-bgSecondary dark:border-bgSecondary-dark min-w-[52px] md:min-w-[80px]"
        style={{ order: values.length }}
      >
        <span className="font-sans text-[6px] md:text-[8px] tracking-[0.22em] uppercase text-textMuted dark:text-textMuted-dark">
          {label}
        </span>
      </div>

      {values.map((value, i) => (
        <div
          key={i}
          className={`px-2 md:px-4 ${i === 0 ? "text-right" : "text-left"}`}
          style={{ order: i < Math.floor(values.length / 2) ? i : i + 1 }}
        >
          <span
            className={`font-heading text-xs md:text-base transition-colors duration-300 ${
              winnerIndex === i
                ? "text-textPrimary dark:text-textPrimary-dark font-normal"
                : "text-textMuted dark:text-textMuted-dark font-light"
            }`}
          >
            {value}
          </span>
          {winnerIndex === i && (
            <span className="block font-sans text-[6px] md:text-[7px] tracking-[0.18em] uppercase text-green-600 dark:text-green-400 mt-1">
              ✓ Best
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Single product column ────────────────────────────────────────────────────
function ProductColumn({
  product,
  isWinner,
  disc,
  priceWinner,
  onNavigate,
}: {
  product: Product;
  isWinner: boolean;
  disc: number;
  priceWinner: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col border-r last:border-r-0 border-bgSecondary dark:border-bgSecondary-dark">
      {/* Hero image */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark cursor-pointer group"
        onClick={onNavigate}
      >
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div
          className={`absolute top-2 left-2 md:top-4 md:left-4 font-sans text-[6px] md:text-[8px] tracking-[0.18em] uppercase px-1.5 py-0.5 md:px-2.5 md:py-1 ${
            isWinner
              ? "bg-green-600 text-white font-semibold border-none"
              : "bg-transparent text-textMuted dark:text-textMuted-dark border border-borderDark dark:border-borderDark-dark"
          }`}
        >
          {isWinner ? "✓ Best value" : product.brand}
        </div>
        {disc > 0 && (
          <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-accentRed text-white font-sans text-[7px] md:text-[9px] tracking-[0.08em] px-1.5 py-0.5 md:px-2 md:py-1">
            −{disc}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 md:p-6 flex flex-col flex-1">
        <p className="font-sans text-[7px] md:text-[8px] tracking-[0.26em] uppercase text-textMuted dark:text-textMuted-dark mb-1 md:mb-2">
          {product.brand} {product.color && `· ${product.color}`}
        </p>
        <h3 className="font-heading font-light text-[13px] md:text-[18px] text-textPrimary dark:text-textPrimary-dark mb-2 md:mb-4 leading-[1.15] tracking-[-0.01em]">
          {toTitleCase(product.name)}
        </h3>

        <div className="flex flex-col gap-1 mb-4 md:mb-5">
          <span
            className={`font-heading text-base md:text-xl ${
              priceWinner
                ? "text-textPrimary dark:text-textPrimary-dark"
                : "text-textSecondary dark:text-textSecondary-dark"
            }`}
          >
            {product.price.toLocaleString("tr-TR")} {product.currency}
          </span>
          {product.originalPrice && (
            <span className="font-heading text-[11px] md:text-[13px] text-borderDark dark:text-borderDark-dark line-through">
              {product.originalPrice.toLocaleString("tr-TR")}
            </span>
          )}
        </div>

        <div className="hidden md:block mb-5 opacity-80">
          <PriceHistoryChart
            history={product.priceHistory}
            currentPrice={product.price}
            originalPrice={product.originalPrice}
            currency={product.currency}
            theme="dark"
          />
        </div>

        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-4">
            <p className="font-sans text-[7px] md:text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark mb-1.5">
              Sizes
            </p>
            <div className="flex flex-wrap gap-1">
              {product.sizes.slice(0, 6).map((sz, i) => (
                <span
                  key={i}
                  className="font-sans text-[8px] md:text-[9px] px-1.5 py-0.5 border border-borderLight dark:border-borderLight-dark text-textSecondary dark:text-textSecondary-dark"
                >
                  {sz}
                </span>
              ))}
              {product.sizes.length > 6 && (
                <span className="font-sans text-[8px] md:text-[9px] px-1.5 py-0.5 text-textMuted dark:text-textMuted-dark">
                  +{product.sizes.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto block p-2 md:p-3 bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[7px] md:text-[9px] tracking-[0.22em] uppercase text-center font-medium hover:opacity-80 transition-opacity"
        >
          View <span className="hidden sm:inline">on {product.brand} </span>→
        </a>
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export function CompareOverlay() {
  const { compareList, overlayOpen, closeOverlay } = useCompare();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    if (overlayOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [overlayOpen, closeOverlay]);

  if (!overlayOpen || compareList.length < 2) return null;

  const products = compareList as Product[];
  const count = products.length; // 2 or 3

  // ── Per-product computed stats ──
  const discs = products.map((p) =>
    p.originalPrice ? discountPct(p.originalPrice, p.price) : 0,
  );

  const lowestPrice = Math.min(...products.map((p) => p.price));
  const highestDisc = Math.max(...discs);
  const mostSizes = Math.max(...products.map((p) => p.sizes?.length ?? 0));

  const priceWinnerIndex = products.findIndex((p) => p.price === lowestPrice);
  // If all prices equal it's a tie — no winner
  const priceWinner =
    products.filter((p) => p.price === lowestPrice).length === 1
      ? priceWinnerIndex
      : null;

  const discountWinner =
    highestDisc === 0
      ? null
      : discs.filter((d) => d === highestDisc).length === 1
        ? discs.indexOf(highestDisc)
        : null;

  const sizesWinner =
    products.filter((p) => (p.sizes?.length ?? 0) === mostSizes).length === 1
      ? products.findIndex((p) => (p.sizes?.length ?? 0) === mostSizes)
      : null;

  // ── Overall winner by score ──
  const scores = products.map((_, i) => {
    let s = 0;
    if (priceWinner === i) s++;
    if (discountWinner === i) s++;
    if (sizesWinner === i) s++;
    return s;
  });
  const maxScore = Math.max(...scores);
  const overallWinnerIndex =
    maxScore > 0 && scores.filter((s) => s === maxScore).length === 1
      ? scores.indexOf(maxScore)
      : null;

  return (
    <div
      className="fixed inset-0 z-[900] bg-bgPrimary dark:bg-bgPrimary-dark flex flex-col"
      style={{ animation: "cov-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}
    >
      {/* ── Top bar ── */}
      <div className="flex justify-between items-center p-4 md:py-5 md:px-12 border-b border-bgSecondary dark:border-bgSecondary-dark flex-shrink-0">
        <div>
          <p className="font-sans text-[7px] md:text-[8px] tracking-[0.3em] uppercase text-textMuted dark:text-textMuted-dark mb-0.5 md:mb-1">
            Side by Side
          </p>
          <h2 className="font-heading font-light text-lg md:text-xl text-textPrimary dark:text-textPrimary-dark m-0 tracking-[0.02em]">
            Compare {count > 2 ? `(${count})` : ""}
          </h2>
        </div>

        {overallWinnerIndex !== null && (
          <div className="hidden md:block text-center">
            <p className="font-sans text-[8px] tracking-[0.24em] uppercase text-textMuted dark:text-textMuted-dark mb-1">
              Best value
            </p>
            <p className="font-heading italic text-base text-green-600 dark:text-green-400 m-0">
              {toTitleCase(products[overallWinnerIndex].name)
                .split(" ")
                .slice(0, 4)
                .join(" ")}
            </p>
          </div>
        )}

        <button
          className="font-sans text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-textSecondary dark:text-textSecondary-dark bg-bgSecondary dark:bg-bgSecondary-dark border-none cursor-pointer px-3 py-2 md:px-5 md:py-2.5 flex items-center gap-2 hover:bg-bgHover dark:hover:bg-bgHover-dark transition-colors"
          onClick={closeOverlay}
        >
          <span>✕</span> <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* ── Unified Scrollable Area (Fixes Mobile Squish) ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Enforce a minimum width on mobile so items don't crush together */}
        <div
          className={`min-h-full flex flex-col ${count === 3 ? "min-w-[750px] md:min-w-0" : "min-w-[500px] md:min-w-0"}`}
        >
          {/* ── Products Grid ── */}
          <div
            className="flex-1"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${count}, 1fr)`,
            }}
          >
            {products.map((product, i) => (
              <ProductColumn
                key={product.id}
                product={product}
                isWinner={overallWinnerIndex === i}
                disc={discs[i]}
                priceWinner={priceWinner === i}
                onNavigate={() => {
                  closeOverlay();
                  navigate(`/product/${product.id}`);
                }}
              />
            ))}
          </div>

          {/* ── Bottom stat bar ── */}
          <div className="border-t border-bgSecondary dark:border-bgSecondary-dark bg-bgPrimary dark:bg-bgPrimary-dark pb-2 mt-auto">
            {/* Header row */}
            <div
              className="px-2 md:px-6 pt-3 border-b border-bgSecondary dark:border-bgSecondary-dark"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${count}, 1fr) auto`,
              }}
            >
              {products.map((p, i) => (
                <p
                  key={i}
                  className={`font-heading italic text-[10px] md:text-[12px] text-textMuted dark:text-textMuted-dark m-0 ${
                    i === 0 ? "text-right pr-2 md:pr-4" : "pl-2 md:pl-4"
                  }`}
                  style={{ order: i < Math.floor(count / 2) ? i : i + 1 }}
                >
                  {toTitleCase(p.name).split(" ").slice(0, 3).join(" ")}
                </p>
              ))}
              <p
                className="font-sans text-[6px] md:text-[8px] tracking-[0.22em] uppercase text-borderDark dark:text-borderDark-dark m-0 px-2 md:px-4 text-center min-w-[52px] md:min-w-[80px]"
                style={{ order: Math.floor(count / 2) }}
              >
                Stats
              </p>
            </div>

            <div className="px-2 md:px-6">
              <StatRow
                label="Price"
                values={products.map(
                  (p) => `${p.price.toLocaleString("tr-TR")} ${p.currency}`,
                )}
                winnerIndex={priceWinner}
                delay={0.7}
              />
              {highestDisc > 0 && (
                <StatRow
                  label="Discount"
                  values={discs.map((d) => (d > 0 ? `−${d}%` : "—"))}
                  winnerIndex={discountWinner}
                  delay={0.75}
                />
              )}
              <StatRow
                label="Sizes"
                values={products.map((p) => `${p.sizes?.length ?? 0} opts`)}
                winnerIndex={sizesWinner}
                delay={0.8}
              />
              <StatRow
                label="Brand"
                values={products.map((p) => p.brand)}
                winnerIndex={null}
                delay={0.85}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
