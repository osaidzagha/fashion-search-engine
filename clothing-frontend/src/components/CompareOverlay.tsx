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

// ─── Product header column (image + name + price) ────────────────────────────
function ProductHeader({
  product,
  isWinner,
  disc,
  priceWinner,
  index,
  total,
  onNavigate,
}: {
  product: Product;
  isWinner: boolean;
  disc: number;
  priceWinner: boolean;
  index: number;
  total: number;
  onNavigate: () => void;
}) {
  return (
    <div
      className={`flex flex-col ${index < total - 1 ? "border-r border-bgSecondary dark:border-bgSecondary-dark" : ""}`}
    >
      {/* Image */}
      <div
        className="relative overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark cursor-pointer group"
        style={{ aspectRatio: "3/4" }}
        onClick={onNavigate}
      >
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        {/* Winner badge */}
        {isWinner && (
          <div className="absolute top-3 left-3 bg-green-600 text-white font-sans text-[7px] md:text-[8px] tracking-[0.18em] uppercase px-2 py-1">
            ✓ Best value
          </div>
        )}

        {/* Discount badge */}
        {disc > 0 && (
          <div className="absolute top-3 right-3 bg-accentRed text-white font-sans text-[7px] md:text-[9px] tracking-[0.08em] px-1.5 py-0.5 md:px-2 md:py-1">
            −{disc}%
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
          <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            View details →
          </span>
        </div>
      </div>

      {/* Name + price */}
      <div className="p-3 md:p-5 flex flex-col gap-2 flex-1">
        <p className="font-sans text-[7px] md:text-[8px] tracking-[0.26em] uppercase text-textMuted dark:text-textMuted-dark">
          {product.brand}
          {product.color && (
            <span className="text-textMuted/60 dark:text-textMuted-dark/60">
              {" "}
              · {product.color}
            </span>
          )}
        </p>
        <h3 className="font-heading font-light text-[13px] md:text-[17px] text-textPrimary dark:text-textPrimary-dark leading-[1.2] tracking-[-0.01em]">
          {toTitleCase(product.name)}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span
            className={`font-heading text-sm md:text-lg ${
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
          {priceWinner && (
            <span className="font-sans text-[7px] tracking-[0.16em] uppercase text-green-600 dark:text-green-400">
              Lowest
            </span>
          )}
        </div>

        {/* CTA */}
        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 block p-2 md:p-2.5 bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[7px] md:text-[8px] tracking-[0.22em] uppercase text-center font-medium hover:opacity-80 transition-opacity"
        >
          Shop on {product.brand} →
        </a>
      </div>
    </div>
  );
}

// ─── Stat row — clean, readable, no CSS order tricks ─────────────────────────
function StatRow({
  label,
  values,
  winnerIndex,
  delay,
  count,
}: {
  label: string;
  values: React.ReactNode[];
  winnerIndex: number | null;
  delay: number;
  count: number;
}) {
  return (
    <div
      className="border-b border-bgSecondary dark:border-bgSecondary-dark last:border-b-0"
      style={{ animation: `cov-rowIn 0.4s ease ${delay}s both` }}
    >
      {/* Label */}
      <p className="font-sans text-[7px] md:text-[8px] tracking-[0.24em] uppercase text-textMuted dark:text-textMuted-dark px-4 md:px-6 pt-3 pb-1">
        {label}
      </p>
      {/* Values row */}
      <div
        className="grid pb-3 px-4 md:px-6"
        style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
      >
        {values.map((value, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <span
              className={`font-heading text-sm md:text-base transition-colors duration-300 ${
                winnerIndex === i
                  ? "text-textPrimary dark:text-textPrimary-dark font-normal"
                  : "text-textMuted dark:text-textMuted-dark font-light"
              }`}
            >
              {value}
            </span>
            {winnerIndex === i && (
              <span className="font-sans text-[6px] md:text-[7px] tracking-[0.18em] uppercase text-green-600 dark:text-green-400">
                ✓ Best
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Price history section ────────────────────────────────────────────────────
function PriceHistoryRow({ products }: { products: Product[] }) {
  const isDark = document.documentElement.classList.contains("dark");
  return (
    <div className="border-b border-bgSecondary dark:border-bgSecondary-dark hidden md:block">
      <p className="font-sans text-[7px] md:text-[8px] tracking-[0.24em] uppercase text-textMuted dark:text-textMuted-dark px-4 md:px-6 pt-3 pb-2">
        Price history
      </p>
      <div
        className="grid pb-4 px-4 md:px-6 gap-4"
        style={{ gridTemplateColumns: `repeat(${products.length}, 1fr)` }}
      >
        {products.map((p, i) => (
          <div key={i} className="opacity-80">
            <PriceHistoryChart
              history={p.priceHistory}
              currentPrice={p.price}
              originalPrice={p.originalPrice}
              currency={p.currency}
              theme={isDark ? "dark" : "light"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sizes section ────────────────────────────────────────────────────────────
function SizesRow({ products }: { products: Product[] }) {
  const hasSizes = products.some((p) => p.sizes && p.sizes.length > 0);
  if (!hasSizes) return null;

  return (
    <div className="border-b border-bgSecondary dark:border-bgSecondary-dark">
      <p className="font-sans text-[7px] md:text-[8px] tracking-[0.24em] uppercase text-textMuted dark:text-textMuted-dark px-4 md:px-6 pt-3 pb-2">
        Available sizes
      </p>
      <div
        className="grid pb-4 px-4 md:px-6 gap-4"
        style={{ gridTemplateColumns: `repeat(${products.length}, 1fr)` }}
      >
        {products.map((p, i) => (
          <div key={i} className="flex flex-wrap gap-1">
            {p.sizes && p.sizes.length > 0 ? (
              <>
                {p.sizes.slice(0, 8).map((sz, j) => (
                  <span
                    key={j}
                    className="font-sans text-[8px] md:text-[9px] px-1.5 py-0.5 border border-borderLight dark:border-borderLight-dark text-textSecondary dark:text-textSecondary-dark"
                  >
                    {sz}
                  </span>
                ))}
                {p.sizes.length > 8 && (
                  <span className="font-sans text-[8px] md:text-[9px] px-1.5 py-0.5 text-textMuted dark:text-textMuted-dark">
                    +{p.sizes.length - 8}
                  </span>
                )}
              </>
            ) : (
              <span className="font-sans text-[9px] text-textMuted dark:text-textMuted-dark">
                —
              </span>
            )}
          </div>
        ))}
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
  const count = products.length;

  // ── Per-product computed stats ──
  const discs = products.map((p) =>
    p.originalPrice ? discountPct(p.originalPrice, p.price) : 0,
  );

  const lowestPrice = Math.min(...products.map((p) => p.price));
  const highestDisc = Math.max(...discs);
  const mostSizes = Math.max(...products.map((p) => p.sizes?.length ?? 0));

  const priceWinner =
    products.filter((p) => p.price === lowestPrice).length === 1
      ? products.findIndex((p) => p.price === lowestPrice)
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
      style={{ animation: "cov-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both" }}
    >
      {/* ── Top bar ── */}
      <div className="flex justify-between items-center px-4 md:px-10 py-4 md:py-5 border-b border-bgSecondary dark:border-bgSecondary-dark flex-shrink-0">
        <div>
          <p className="font-sans text-[7px] md:text-[8px] tracking-[0.3em] uppercase text-textMuted dark:text-textMuted-dark mb-0.5">
            Side by side
          </p>
          <h2 className="font-heading font-light text-lg md:text-xl text-textPrimary dark:text-textPrimary-dark tracking-[0.02em]">
            Compare{" "}
            <span className="text-textMuted dark:text-textMuted-dark text-base">
              ({count})
            </span>
          </h2>
        </div>

        {overallWinnerIndex !== null && (
          <div className="hidden md:flex flex-col items-center gap-1 px-6 py-2 border border-green-600/30 dark:border-green-400/30">
            <p className="font-sans text-[7px] tracking-[0.24em] uppercase text-green-600 dark:text-green-400">
              ✓ Best value
            </p>
            <p className="font-heading font-light italic text-sm text-textPrimary dark:text-textPrimary-dark">
              {toTitleCase(products[overallWinnerIndex].name)
                .split(" ")
                .slice(0, 4)
                .join(" ")}
            </p>
          </div>
        )}

        <button
          className="font-sans text-[8px] md:text-[9px] tracking-[0.2em] uppercase text-textSecondary dark:text-textSecondary-dark bg-bgSecondary dark:bg-bgSecondary-dark border-none cursor-pointer px-4 py-2.5 md:px-5 md:py-3 flex items-center gap-2 hover:bg-bgHover dark:hover:bg-bgHover-dark transition-colors"
          onClick={closeOverlay}
        >
          <span>✕</span>
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* ── Scrollable area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          className={`min-h-full flex flex-col ${
            count === 3
              ? "min-w-[680px] md:min-w-0"
              : "min-w-[440px] md:min-w-0"
          }`}
        >
          {/* ── Product headers ── */}
          <div
            className="grid border-b border-bgSecondary dark:border-bgSecondary-dark flex-shrink-0"
            style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
          >
            {products.map((product, i) => (
              <ProductHeader
                key={product.id}
                product={product}
                isWinner={overallWinnerIndex === i}
                disc={discs[i]}
                priceWinner={priceWinner === i}
                index={i}
                total={count}
                onNavigate={() => {
                  closeOverlay();
                  navigate(`/product/${product.id}`);
                }}
              />
            ))}
          </div>

          {/* ── Stats section ── */}
          <div className="flex-1">
            {/* Section header */}
            <div className="px-4 md:px-6 py-3 border-b border-bgSecondary dark:border-bgSecondary-dark bg-bgSecondary/40 dark:bg-bgSecondary-dark/40">
              <p className="font-sans text-[7px] md:text-[8px] tracking-[0.28em] uppercase text-textMuted dark:text-textMuted-dark">
                Comparison
              </p>
            </div>

            <StatRow
              label="Current price"
              values={products.map(
                (p) => `${p.price.toLocaleString("tr-TR")} ${p.currency}`,
              )}
              winnerIndex={priceWinner}
              delay={0.15}
              count={count}
            />

            {highestDisc > 0 && (
              <StatRow
                label="Discount"
                values={discs.map((d) => (d > 0 ? `−${d}%` : "—"))}
                winnerIndex={discountWinner}
                delay={0.2}
                count={count}
              />
            )}

            <StatRow
              label="Sizes available"
              values={products.map((p) =>
                p.sizes?.length ? `${p.sizes.length} options` : "—",
              )}
              winnerIndex={sizesWinner}
              delay={0.25}
              count={count}
            />

            <StatRow
              label="Brand"
              values={products.map((p) => p.brand)}
              winnerIndex={null}
              delay={0.3}
              count={count}
            />

            {products.some((p) => p.category) && (
              <StatRow
                label="Category"
                values={products.map((p) =>
                  p.category ? toTitleCase(p.category) : "—",
                )}
                winnerIndex={null}
                delay={0.35}
                count={count}
              />
            )}

            <SizesRow products={products} />
            <PriceHistoryRow products={products} />
          </div>
        </div>
      </div>
    </div>
  );
}
