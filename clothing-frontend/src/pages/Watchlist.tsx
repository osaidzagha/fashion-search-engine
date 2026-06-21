import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchWatchlist, removeFromWatchlist } from "../services/api";
import PageTransition from "../components/PageTransition";
import { PriceSparkline } from "../components/PriceSparkline";
import { RevealOnScroll } from "../components/RevealOnScroll";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WatchlistItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  images: string[];
  trackedPrice: number;
  targetPrice?: number;
  priceHistory?: { price: number; date: string }[];
  addedAt?: string;
}

type SortKey = "drop" | "target" | "recent";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Muted drop badge — deep red, not alarming */
function DropBadge({ amount, currency }: { amount: number; currency: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 font-sans text-[8px] tracking-widest uppercase text-accentRed border border-accentRed/30 bg-accentRed/5">
      ↓ {Math.abs(amount).toLocaleString("tr-TR")} {currency}
    </span>
  );
}

/** Target progress bar — shows how close price is to the user's target */
function TargetProgressBar({
  current,
  tracked,
  target,
}: {
  current: number;
  tracked: number;
  target: number;
}) {
  // Progress = how far current has moved toward target from tracked price
  // 0% = still at tracked price, 100% = hit target or below
  const range = tracked - target;
  if (range <= 0) return null;
  const progress = Math.min(100, Math.max(0, ((tracked - current) / range) * 100));
  const hit = current <= target;

  return (
    <div className="mt-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
          Target
        </span>
        <span
          className={`font-sans text-[8px] tracking-widest uppercase ${hit ? "text-accentRed" : "text-textMuted dark:text-textMuted-dark"}`}
        >
          {hit ? "✓ Reached" : `${Math.round(progress)}%`}
        </span>
      </div>
      {/* The bar — only transform/opacity ever animate */}
      <div className="h-px w-full bg-borderLight dark:bg-borderLight-dark relative overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-700 ease-out ${hit ? "bg-accentRed" : "bg-textPrimary dark:bg-textPrimary-dark"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="font-sans text-[8px] text-textMuted dark:text-textMuted-dark mt-1">
        {target.toLocaleString("tr-TR")} {""} target
      </p>
    </div>
  );
}

/** Skeleton row for loading state */
function SkeletonRow() {
  return (
    <div className="flex gap-4 py-6 border-b border-borderLight dark:border-borderLight-dark">
      <div className="w-16 h-20 flex-shrink-0 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-2 w-20 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe rounded" />
        <div className="h-4 w-48 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe rounded" />
        <div className="h-2 w-28 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe rounded" />
      </div>
      <div className="hidden md:flex flex-col gap-2 justify-center items-end">
        <div className="h-4 w-24 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe rounded" />
        <div className="h-2 w-16 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe rounded" />
      </div>
    </div>
  );
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function sortItems(items: WatchlistItem[], key: SortKey): WatchlistItem[] {
  const clone = [...items];
  if (key === "drop") {
    // Biggest absolute price drop first; items without a drop go to end
    return clone.sort((a, b) => {
      const dropA = a.trackedPrice - a.price;
      const dropB = b.trackedPrice - b.price;
      return dropB - dropA;
    });
  }
  if (key === "target") {
    // Closest to target first; items without a target go to end
    return clone.sort((a, b) => {
      const hasA = a.targetPrice != null && a.targetPrice > 0;
      const hasB = b.targetPrice != null && b.targetPrice > 0;
      if (!hasA && !hasB) return 0;
      if (!hasA) return 1;
      if (!hasB) return -1;
      // Distance = how far above target the price still is
      const distA = a.price - a.targetPrice!;
      const distB = b.price - b.targetPrice!;
      return distA - distB;
    });
  }
  // "recent" — keep original fetch order (server returns in addedAt order)
  return clone;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Watchlist() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadWatchlist();
  }, [isAuthenticated, navigate]);

  const loadWatchlist = () => {
    setIsLoading(true);
    fetchWatchlist()
      .then((data: any) => {
        const raw = Array.isArray(data) ? data : data?.items || [];
        setItems(raw as WatchlistItem[]);
      })
      .catch(() => {
        toast.error("Could not load your watchlist. Please try again.");
      })
      .finally(() => setIsLoading(false));
  };

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    // Optimistic: remove from list immediately
    setItems((prev) => prev.filter((item) => item.id !== productId));
    try {
      await removeFromWatchlist(productId);
    } catch {
      // Rollback on failure
      loadWatchlist();
    } finally {
      setRemovingId(null);
    }
  };

  // ── Derived analytics ──────────────────────────────────────────────────────
  const droppedItems = useMemo(
    () => items.filter((item) => item.price < item.trackedPrice),
    [items],
  );
  const targetHitItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.targetPrice != null &&
          item.targetPrice > 0 &&
          item.price <= item.targetPrice,
      ),
    [items],
  );

  const sortedItems = useMemo(
    () => sortItems(items, sortKey),
    [items, sortKey],
  );

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark">
          {/* Header skeleton */}
          <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-32 pb-8 md:pb-16 border-b border-borderLight dark:border-borderLight-dark">
            <div className="max-w-[1400px] mx-auto space-y-3">
              <div className="h-2 w-24 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe rounded" />
              <div className="h-10 w-64 bg-bgSecondary dark:bg-bgSecondary-dark animate-breathe rounded" />
            </div>
          </div>
          <div className="max-w-[1400px] mx-auto px-6 md:px-16 lg:px-24 pt-8">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  const totalTracked = items.length;

  return (
    <PageTransition>
      <div className="min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark">

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-32 pb-8 md:pb-16 border-b border-borderLight dark:border-borderLight-dark">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-8 md:gap-0">

              {/* Left: title */}
              <div>
                <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-3">
                  Your Portfolio
                </p>
                <h1 className="font-heading font-light text-[clamp(32px,5vw,56px)] leading-none tracking-[-0.02em] text-textPrimary dark:text-textPrimary-dark">
                  Tracked{" "}
                  <em className="italic text-textSecondary dark:text-textSecondary-dark">
                    Archive.
                  </em>
                </h1>
                {/* Summary line — only shown when there's data */}
                {totalTracked > 0 && (
                  <p className="font-sans text-[11px] leading-relaxed text-textMuted dark:text-textMuted-dark mt-3 max-w-sm">
                    {droppedItems.length > 0 ? (
                      <>
                        <span className="text-accentRed">
                          {droppedItems.length}{" "}
                          {droppedItems.length === 1 ? "item has" : "items have"} dropped
                        </span>{" "}
                        since you started tracking.
                        {targetHitItems.length > 0 && (
                          <> {targetHitItems.length} {targetHitItems.length === 1 ? "target" : "targets"} reached.</>
                        )}
                      </>
                    ) : (
                      <>Tracking {totalTracked} {totalTracked === 1 ? "piece" : "pieces"}. No drops yet.</>
                    )}
                  </p>
                )}
              </div>

              {/* Right: KPI tiles */}
              {totalTracked > 0 && (
                <div className="flex gap-10 md:gap-14">
                  <div>
                    <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-2">
                      Tracking
                    </p>
                    <p className="font-heading font-light text-3xl md:text-4xl text-textPrimary dark:text-textPrimary-dark leading-none">
                      {totalTracked}
                    </p>
                  </div>
                  {droppedItems.length > 0 && (
                    <div>
                      <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-2">
                        Dropped
                      </p>
                      <p className="font-heading font-light text-3xl md:text-4xl text-accentRed leading-none">
                        {droppedItems.length}
                      </p>
                    </div>
                  )}
                  {targetHitItems.length > 0 && (
                    <div>
                      <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-2">
                        Targets hit
                      </p>
                      <p className="font-heading font-light text-3xl md:text-4xl text-textPrimary dark:text-textPrimary-dark leading-none">
                        {targetHitItems.length}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ LEDGER ══════════════════════════════════════════════════════════ */}
        <div className="max-w-[1400px] mx-auto px-6 md:px-16 lg:px-24 pb-24 md:pb-32">

          {totalTracked === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-24 md:py-48 text-center">
              <p className="font-heading font-light italic text-[clamp(28px,4vw,48px)] text-textSecondary dark:text-textSecondary-dark mb-2 leading-tight">
                Nothing tracked yet.
              </p>
              <p className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-10">
                Add pieces from the catalogue to start watching their prices.
              </p>
              <button
                onClick={() => navigate("/collection")}
                className="px-8 py-3.5 bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[9px] tracking-widest uppercase border-none cursor-pointer transition-opacity duration-200 hover:opacity-75"
              >
                Explore Catalogue
              </button>
            </div>
          ) : (
            <>
              {/* ── Sort controls ── */}
              <div className="flex items-center gap-1 pt-6 pb-5 border-b border-borderLight dark:border-borderLight-dark">
                <span className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mr-4">
                  Sort
                </span>
                {(
                  [
                    { key: "recent", label: "Recent" },
                    { key: "drop", label: "Biggest Drop" },
                    { key: "target", label: "Closest to Target" },
                  ] as { key: SortKey; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortKey(key)}
                    className={[
                      "font-sans text-[9px] tracking-widest uppercase px-3 py-1.5 transition-all duration-200 border",
                      sortKey === key
                        ? "bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-textPrimary dark:border-textPrimary-dark"
                        : "text-textMuted dark:text-textMuted-dark border-transparent hover:border-borderLight dark:hover:border-borderLight-dark hover:text-textPrimary dark:hover:text-textPrimary-dark",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Column headers (md+) ── */}
              <div className="hidden md:grid grid-cols-[80px_2fr_1fr_140px_120px] items-center gap-4 py-3 border-b border-borderLight dark:border-borderLight-dark">
                {["", "Item", "Price", "Trend", ""].map((col, i) => (
                  <span
                    key={i}
                    className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark"
                  >
                    {col}
                  </span>
                ))}
              </div>

              {/* ── Item rows ── */}
              <div>
                {sortedItems.map((item, idx) => {
                  const drop = item.trackedPrice - item.price;
                  const hasDropped = drop > 0;
                  const hasIncreased = item.price > item.trackedPrice;
                  const hasTarget =
                    item.targetPrice != null && item.targetPrice > 0;
                  const targetHit = hasTarget && item.price <= item.targetPrice!;
                  const sparkData =
                    item.priceHistory && item.priceHistory.length >= 2
                      ? item.priceHistory
                      : null;

                  return (
                    <RevealOnScroll
                      key={item.id}
                      delay={idx * 40}
                      distance={16}
                      threshold={0.05}
                      as="div"
                      className="grid grid-cols-1 md:grid-cols-[80px_2fr_1fr_140px_120px] items-start md:items-center gap-4 md:gap-4 py-6 border-b border-borderLight dark:border-borderLight-dark"
                    >
                      {/* ── Thumbnail ── */}
                      <Link
                        to={`/product/${item.id}`}
                        className="block flex-shrink-0 w-16 md:w-auto"
                      >
                        <div className="relative overflow-hidden w-16 md:w-[72px] aspect-[2/3] bg-bgSecondary dark:bg-bgSecondary-dark group">
                          {item.images?.[0] && (
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                              loading="lazy"
                            />
                          )}
                          {hasDropped && (
                            <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-accentRed" />
                          )}
                        </div>
                      </Link>

                      {/* ── Info ── */}
                      <div className="min-w-0">
                        <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-1.5">
                          {item.brand}
                        </p>
                        <Link
                          to={`/product/${item.id}`}
                          className="no-underline group"
                        >
                          <h3 className="font-heading text-lg md:text-xl font-light text-textPrimary dark:text-textPrimary-dark line-clamp-2 leading-snug group-hover:opacity-50 transition-opacity duration-200">
                            {item.name}
                          </h3>
                        </Link>
                        <p className="font-sans text-[8px] text-textMuted dark:text-textMuted-dark mt-1.5">
                          Tracked at {item.trackedPrice.toLocaleString("tr-TR")} {item.currency}
                        </p>
                        {hasDropped && (
                          <div className="mt-2">
                            <DropBadge amount={drop} currency={item.currency} />
                          </div>
                        )}
                      </div>

                      {/* ── Price ── */}
                      <div>
                        <p
                          className={[
                            "font-heading text-xl md:text-2xl font-light leading-none",
                            hasDropped
                              ? "text-accentRed"
                              : hasIncreased
                                ? "text-textMuted dark:text-textMuted-dark"
                                : "text-textPrimary dark:text-textPrimary-dark",
                          ].join(" ")}
                        >
                          {item.price.toLocaleString("tr-TR")}
                          <span className="text-[13px] ml-1 font-sans font-normal">
                            {item.currency}
                          </span>
                        </p>

                        {/* Target progress bar */}
                        {hasTarget && (
                          <TargetProgressBar
                            current={item.price}
                            tracked={item.trackedPrice}
                            target={item.targetPrice!}
                          />
                        )}
                        {targetHit && (
                          <span className="inline-block mt-2 font-sans text-[8px] tracking-widest uppercase text-accentRed">
                            Target reached
                          </span>
                        )}
                      </div>

                      {/* ── Sparkline ── */}
                      <div className="hidden md:flex items-center">
                        <PriceSparkline
                          data={item.priceHistory ?? []}
                          width={100}
                          height={26}
                        />
                      </div>

                      {/* ── Actions ── */}
                      <div className="flex items-center gap-3 justify-start md:justify-end">
                        <button
                          onClick={() => navigate(`/product/${item.id}`)}
                          className="font-sans text-[9px] tracking-widest uppercase text-textPrimary dark:text-textPrimary-dark bg-transparent border border-borderLight dark:border-borderLight-dark cursor-pointer px-4 py-2 hover:bg-textPrimary dark:hover:bg-textPrimary-dark hover:text-bgPrimary dark:hover:text-bgPrimary-dark transition-all duration-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark bg-transparent border-none cursor-pointer py-2 hover:text-accentRed transition-colors duration-200 disabled:opacity-30"
                        >
                          Remove
                        </button>
                      </div>
                    </RevealOnScroll>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
