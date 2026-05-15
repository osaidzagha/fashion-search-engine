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

// ─── Stat row with winner highlight ──────────────────────────────────────────
function StatRow({
  label,
  valueA,
  valueB,
  winner,
  delay,
}: {
  label: string;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  winner: "A" | "B" | "tie" | null;
  delay: number;
}) {
  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-0 py-3 md:py-4 border-b border-bgSecondary dark:border-bgSecondary-dark"
      style={{ animation: `cov-rowIn 0.5s ease ${delay}s both` }}
    >
      {/* Left value */}
      <div className="pr-2 md:pr-8 text-right">
        <span
          className={`font-heading text-xs md:text-base transition-colors duration-300 ${
            winner === "A"
              ? "text-textPrimary dark:text-textPrimary-dark font-normal"
              : "text-textMuted dark:text-textMuted-dark font-light"
          }`}
        >
          {valueA}
        </span>
        {winner === "A" && (
          <span className="block font-sans text-[6px] md:text-[7px] tracking-[0.18em] uppercase text-green-600 dark:text-green-400 mt-1">
            ✓ Better
          </span>
        )}
      </div>

      {/* Center label */}
      <div className="px-2 md:px-5 text-center border-x border-bgSecondary dark:border-bgSecondary-dark min-w-[60px] md:min-w-[96px]">
        <span className="font-sans text-[6px] md:text-[8px] tracking-[0.22em] uppercase text-textMuted dark:text-textMuted-dark">
          {label}
        </span>
        {winner === "tie" && (
          <p className="font-sans text-[6px] md:text-[7px] tracking-[0.14em] uppercase text-textTertiary dark:text-textTertiary-dark m-0 mt-1">
            Tie
          </p>
        )}
      </div>

      {/* Right value */}
      <div className="pl-2 md:pl-8">
        <span
          className={`font-heading text-xs md:text-base transition-colors duration-300 ${
            winner === "B"
              ? "text-textPrimary dark:text-textPrimary-dark font-normal"
              : "text-textMuted dark:text-textMuted-dark font-light"
          }`}
        >
          {valueB}
        </span>
        {winner === "B" && (
          <span className="block font-sans text-[6px] md:text-[7px] tracking-[0.18em] uppercase text-green-600 dark:text-green-400 mt-1">
            ✓ Better
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export function CompareOverlay() {
  const { compareList, overlayOpen, closeOverlay } = useCompare();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    if (overlayOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [overlayOpen, closeOverlay]);

  if (!overlayOpen || compareList.length < 2) return null;

  const [A, B] = compareList as [Product, Product];

  // ── Computed stats ──
  const priceWinner: "A" | "B" | "tie" =
    A.price < B.price ? "A" : B.price < A.price ? "B" : "tie";

  const discA = A.originalPrice ? discountPct(A.originalPrice, A.price) : 0;
  const discB = B.originalPrice ? discountPct(B.originalPrice, B.price) : 0;
  const discountWinner: "A" | "B" | "tie" | null =
    discA === 0 && discB === 0
      ? null
      : discA > discB
        ? "A"
        : discB > discA
          ? "B"
          : "tie";

  const sizesA = A.sizes?.length ?? 0;
  const sizesB = B.sizes?.length ?? 0;
  const sizesWinner: "A" | "B" | "tie" =
    sizesA > sizesB ? "A" : sizesB > sizesA ? "B" : "tie";

  const brandWinner: "A" | "B" | "tie" | null =
    A.brand !== B.brand ? null : "tie";

  // ── Overall winner ──
  let scoreA = 0;
  let scoreB = 0;
  if (priceWinner === "A") scoreA++;
  if (priceWinner === "B") scoreB++;
  if (discountWinner === "A") scoreA++;
  if (discountWinner === "B") scoreB++;
  if (sizesWinner === "A") scoreA++;
  if (sizesWinner === "B") scoreB++;
  const overallWinner: "A" | "B" | null =
    scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;

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
            Compare
          </h2>
        </div>

        {/* Overall verdict */}
        {overallWinner && (
          <div className="hidden md:block text-center">
            <p className="font-sans text-[8px] tracking-[0.24em] uppercase text-textMuted dark:text-textMuted-dark mb-1">
              Better value
            </p>
            <p className="font-heading italic text-base text-green-600 dark:text-green-400 m-0">
              {toTitleCase(overallWinner === "A" ? A.name : B.name)
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

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto grid grid-cols-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* ══ PRODUCT A ══ */}
        <div className="border-r border-bgSecondary dark:border-bgSecondary-dark flex flex-col">
          {/* Hero image */}
          <div
            className="relative aspect-[3/4] overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark cursor-pointer group"
            onClick={() => {
              closeOverlay();
              navigate(`/product/${A.id}`);
            }}
          >
            {A.images?.[0] && (
              <img
                src={A.images[0]}
                alt={A.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ animation: "cov-imgIn 0.8s ease 0.2s both" }}
              />
            )}
            <div
              className={`absolute top-2 left-2 md:top-4 md:left-4 font-sans text-[6px] md:text-[8px] tracking-[0.18em] uppercase px-1.5 py-0.5 md:px-2.5 md:py-1 ${
                overallWinner === "A"
                  ? "bg-green-600 text-white font-semibold border-none"
                  : "bg-transparent text-textMuted dark:text-textMuted-dark border border-borderDark dark:border-borderDark-dark"
              }`}
            >
              {overallWinner === "A" ? "✓ Better value" : A.brand}
            </div>
            {discA > 0 && (
              <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-accentRed text-white font-sans text-[7px] md:text-[9px] tracking-[0.08em] px-1.5 py-0.5 md:px-2 md:py-1">
                −{discA}%
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 md:p-7 md:px-10 flex flex-col flex-1">
            <p className="font-sans text-[7px] md:text-[8px] tracking-[0.26em] uppercase text-textMuted dark:text-textMuted-dark mb-1 md:mb-2">
              {A.brand} {A.color && `· ${A.color}`}
            </p>
            <h3 className="font-heading font-light text-[15px] md:text-[22px] text-textPrimary dark:text-textPrimary-dark mb-2 md:mb-4 leading-[1.15] tracking-[-0.01em]">
              {toTitleCase(A.name)}
            </h3>

            <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2.5 mb-4 md:mb-6">
              <span
                className={`font-heading text-lg md:text-2xl ${
                  priceWinner === "A"
                    ? "text-textPrimary dark:text-textPrimary-dark"
                    : "text-textSecondary dark:text-textSecondary-dark"
                }`}
              >
                {A.price.toLocaleString("tr-TR")} {A.currency}
              </span>
              {A.originalPrice && (
                <span className="font-heading text-[11px] md:text-[15px] text-borderDark dark:text-borderDark-dark line-through">
                  {A.originalPrice.toLocaleString("tr-TR")}
                </span>
              )}
            </div>

            <div className="hidden md:block mb-6 opacity-80">
              <PriceHistoryChart
                history={A.priceHistory}
                currentPrice={A.price}
                originalPrice={A.originalPrice}
                currency={A.currency}
                theme="dark"
              />
            </div>

            {A.sizes && A.sizes.length > 0 && (
              <div className="mb-4 md:mb-5">
                <p className="font-sans text-[7px] md:text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark mb-1.5 md:mb-2">
                  Sizes
                </p>
                <div className="flex flex-wrap gap-1 md:gap-1.5">
                  {A.sizes.map((sz, i) => (
                    <span
                      key={i}
                      className="font-sans text-[8px] md:text-[10px] px-1.5 py-0.5 md:px-2 md:py-1 border border-borderLight dark:border-borderLight-dark text-textSecondary dark:text-textSecondary-dark"
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <a
              href={A.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto block p-2 md:p-3 bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[7px] md:text-[9px] tracking-[0.22em] uppercase text-center font-medium hover:opacity-80 transition-opacity"
            >
              View <span className="hidden sm:inline">on {A.brand} </span>→
            </a>
          </div>
        </div>

        {/* ══ PRODUCT B ══ */}
        <div className="flex flex-col">
          {/* Hero image */}
          <div
            className="relative aspect-[3/4] overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark cursor-pointer group"
            onClick={() => {
              closeOverlay();
              navigate(`/product/${B.id}`);
            }}
          >
            {B.images?.[0] && (
              <img
                src={B.images[0]}
                alt={B.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ animation: "cov-imgIn 0.8s ease 0.35s both" }}
              />
            )}
            <div
              className={`absolute top-2 left-2 md:top-4 md:left-4 font-sans text-[6px] md:text-[8px] tracking-[0.18em] uppercase px-1.5 py-0.5 md:px-2.5 md:py-1 ${
                overallWinner === "B"
                  ? "bg-green-600 text-white font-semibold border-none"
                  : "bg-transparent text-textMuted dark:text-textMuted-dark border border-borderDark dark:border-borderDark-dark"
              }`}
            >
              {overallWinner === "B" ? "✓ Better value" : B.brand}
            </div>
            {discB > 0 && (
              <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-accentRed text-white font-sans text-[7px] md:text-[9px] tracking-[0.08em] px-1.5 py-0.5 md:px-2 md:py-1">
                −{discB}%
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 md:p-7 md:px-10 flex flex-col flex-1">
            <p className="font-sans text-[7px] md:text-[8px] tracking-[0.26em] uppercase text-textMuted dark:text-textMuted-dark mb-1 md:mb-2">
              {B.brand} {B.color && `· ${B.color}`}
            </p>
            <h3 className="font-heading font-light text-[15px] md:text-[22px] text-textPrimary dark:text-textPrimary-dark mb-2 md:mb-4 leading-[1.15] tracking-[-0.01em]">
              {toTitleCase(B.name)}
            </h3>

            <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2.5 mb-4 md:mb-6">
              <span
                className={`font-heading text-lg md:text-2xl ${
                  priceWinner === "B"
                    ? "text-textPrimary dark:text-textPrimary-dark"
                    : "text-textSecondary dark:text-textSecondary-dark"
                }`}
              >
                {B.price.toLocaleString("tr-TR")} {B.currency}
              </span>
              {B.originalPrice && (
                <span className="font-heading text-[11px] md:text-[15px] text-borderDark dark:text-borderDark-dark line-through">
                  {B.originalPrice.toLocaleString("tr-TR")}
                </span>
              )}
            </div>

            <div className="hidden md:block mb-6 opacity-80">
              <PriceHistoryChart
                history={B.priceHistory}
                currentPrice={B.price}
                originalPrice={B.originalPrice}
                currency={B.currency}
                theme="dark"
              />
            </div>

            {B.sizes && B.sizes.length > 0 && (
              <div className="mb-4 md:mb-5">
                <p className="font-sans text-[7px] md:text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark mb-1.5 md:mb-2">
                  Sizes
                </p>
                <div className="flex flex-wrap gap-1 md:gap-1.5">
                  {B.sizes.map((sz, i) => (
                    <span
                      key={i}
                      className="font-sans text-[8px] md:text-[10px] px-1.5 py-0.5 md:px-2 md:py-1 border border-borderLight dark:border-borderLight-dark text-textSecondary dark:text-textSecondary-dark"
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <a
              href={B.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto block p-2 md:p-3 bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[7px] md:text-[9px] tracking-[0.22em] uppercase text-center font-medium hover:opacity-80 transition-opacity"
            >
              View <span className="hidden sm:inline">on {B.brand} </span>→
            </a>
          </div>
        </div>
      </div>

      {/* ── Bottom stat bar ── */}
      <div className="border-t border-bgSecondary dark:border-bgSecondary-dark bg-bgPrimary dark:bg-bgPrimary-dark pb-2 flex-shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] px-2 md:px-10 pt-3 border-b border-bgSecondary dark:border-bgSecondary-dark">
          <p className="font-heading italic text-[10px] md:text-[13px] text-textMuted dark:text-textMuted-dark m-0 text-right pr-2 md:pr-5">
            {toTitleCase(A.name).split(" ").slice(0, 3).join(" ")}
          </p>
          <p className="font-sans text-[6px] md:text-[8px] tracking-[0.22em] uppercase text-borderDark dark:text-borderDark-dark m-0 px-2 md:px-5 text-center min-w-[60px] md:min-w-[96px]">
            Stats
          </p>
          <p className="font-heading italic text-[10px] md:text-[13px] text-textMuted dark:text-textMuted-dark m-0 pl-2 md:pl-5">
            {toTitleCase(B.name).split(" ").slice(0, 3).join(" ")}
          </p>
        </div>

        <div className="px-2 md:px-10">
          <StatRow
            label="Price"
            valueA={`${A.price.toLocaleString("tr-TR")} ${A.currency}`}
            valueB={`${B.price.toLocaleString("tr-TR")} ${B.currency}`}
            winner={priceWinner}
            delay={0.7}
          />
          {discountWinner !== null && (
            <StatRow
              label="Discount"
              valueA={discA > 0 ? `−${discA}%` : "—"}
              valueB={discB > 0 ? `−${discB}%` : "—"}
              winner={discountWinner}
              delay={0.75}
            />
          )}
          <StatRow
            label="Sizes"
            valueA={`${sizesA} opts`}
            valueB={`${sizesB} opts`}
            winner={sizesWinner}
            delay={0.8}
          />
          <StatRow
            label="Brand"
            valueA={A.brand}
            valueB={B.brand}
            winner={brandWinner}
            delay={0.85}
          />
        </div>
      </div>
    </div>
  );
}
