import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchWatchlist, removeFromWatchlist } from "../services/api";
import { Spinner } from "../components/Spinner";
import PageTransition from "../components/PageTransition";

export default function Watchlist() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(
    (state: any) => state.auth.isAuthenticated,
  );

  const [trackedItems, setTrackedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        const items = Array.isArray(data) ? data : data.items || [];
        setTrackedItems(items);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  const handleRemove = async (productId: string) => {
    try {
      setTrackedItems((prev) => prev.filter((item) => item.id !== productId));
      await removeFromWatchlist(productId);
    } catch (error) {
      console.error("Failed to remove item", error);
      loadWatchlist();
    }
  };

  // ── Analytics ────────────────────────────────────────────────────────────
  const totalTracked = trackedItems.length;
  const itemsOnSale = trackedItems.filter(
    (item) => item.price < (item.trackedPrice || item.price),
  ).length;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bgPrimary dark:bg-bgPrimary-dark">
        <Spinner />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark">
        {/* ══ DASHBOARD HEADER ══════════════════════════════════════════════════ */}
        <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-32 pb-8 md:pb-16 border-b border-borderLight dark:border-borderLight-dark">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:justify-between md:items-end gap-6 md:gap-0">
            {/* Left: title */}
            <div>
              <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-2 md:mb-4">
                Your Portfolio
              </p>
              <h1 className="font-heading font-light text-[clamp(32px,5vw,56px)] leading-none tracking-[-0.02em] text-textPrimary dark:text-textPrimary-dark">
                Tracked Archive
              </h1>
            </div>

            {/* Right: KPI pills */}
            {totalTracked > 0 && (
              <div className="flex gap-8 md:gap-12">
                <div>
                  <p className="font-sans text-[9px] md:text-[11px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-1 md:mb-2">
                    Total Tracked
                  </p>
                  <p className="font-sans text-xl md:text-3xl text-textPrimary dark:text-textPrimary-dark">
                    {totalTracked}
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[9px] md:text-[11px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-1 md:mb-2">
                    Target Hit
                  </p>
                  <p
                    className={[
                      "font-sans text-xl md:text-3xl",
                      itemsOnSale > 0
                        ? "text-green-700 dark:text-green-400"
                        : "text-textPrimary dark:text-textPrimary-dark",
                    ].join(" ")}
                  >
                    {itemsOnSale}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ LEDGER LIST ═══════════════════════════════════════════════════════ */}
        <div className="max-w-[1400px] mx-auto px-6 md:px-16 lg:px-24 pb-24 md:pb-32">
          {trackedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 md:py-40 text-center">
              <p className="font-heading italic text-2xl md:text-3xl text-textSecondary dark:text-textSecondary-dark mb-6">
                Your archive is empty.
              </p>
              <button
                onClick={() => navigate("/search")}
                className="px-6 md:px-8 py-3 md:py-4 bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[10px] tracking-widest uppercase border-none cursor-pointer transition-opacity duration-200 hover:opacity-75"
              >
                Explore Catalog
              </button>
            </div>
          ) : (
            <div className="mt-6 md:mt-10">
              {/* ── Table header — hidden on mobile, visible md+ ── */}
              <div className="hidden md:flex pb-4 border-b border-borderLight dark:border-borderLight-dark mb-6">
                <div className="flex-[0_0_120px]" />
                <div className="flex-[2] font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  Item
                </div>
                <div className="flex-1 font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  Current Price
                </div>
                <div className="flex-1 text-right font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  Actions
                </div>
              </div>

              {/* ── Rows ── */}
              {trackedItems.map((product) => {
                const baselinePrice = product.trackedPrice || product.price;
                const priceDifference = product.price - baselinePrice;
                const hasDropped = priceDifference < 0;
                const hasIncreased = priceDifference > 0;

                return (
                  <div
                    key={product.id}
                    className="flex flex-col md:flex-row md:items-center py-5 md:py-6 border-b border-borderLight dark:border-borderLight-dark gap-4 md:gap-0"
                  >
                    {/* ✅ FIX: Mobile Top Row (Image + Info) */}
                    <div className="flex gap-4 md:contents">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 md:flex-[0_0_120px]">
                        <Link to={`/product/${product.id}`}>
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-20 h-[100px] object-cover block"
                          />
                        </Link>
                      </div>

                      {/* Info */}
                      <div className="flex-1 md:flex-[2] md:pr-10 flex flex-col justify-center">
                        <p className="font-sans text-[9px] md:text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-1 md:mb-2">
                          {product.brand}
                        </p>
                        <Link
                          to={`/product/${product.id}`}
                          className="no-underline"
                        >
                          <h3 className="font-heading text-xl md:text-2xl font-normal text-textPrimary dark:text-textPrimary-dark m-0 hover:opacity-60 transition-opacity duration-200 line-clamp-2 md:line-clamp-none">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="font-sans text-[9px] md:text-[10px] text-textMuted dark:text-textMuted-dark mt-1 md:mt-2">
                          Tracked at: {baselinePrice.toLocaleString("tr-TR")}{" "}
                          {product.currency}
                        </p>
                      </div>
                    </div>

                    {/* ✅ FIX: Mobile Bottom Row (Price + Actions) */}
                    <div className="flex items-center justify-between md:contents">
                      {/* Pricing */}
                      <div className="flex-1 md:flex-1">
                        <span
                          className={[
                            "font-sans text-base md:text-lg",
                            hasDropped
                              ? "text-green-700 dark:text-green-400"
                              : hasIncreased
                                ? "text-accentRed"
                                : "text-textPrimary dark:text-textPrimary-dark",
                          ].join(" ")}
                        >
                          {product.price.toLocaleString("tr-TR")}{" "}
                          {product.currency}
                        </span>

                        {hasDropped && (
                          <div className="flex items-center gap-1.5 mt-1 md:mt-2">
                            <span className="text-green-700 dark:text-green-400 text-[10px] md:text-xs">
                              ▼
                            </span>
                            <span className="font-sans text-[9px] md:text-[10px] tracking-widest uppercase text-green-700 dark:text-green-400">
                              Down{" "}
                              {Math.abs(priceDifference).toLocaleString(
                                "tr-TR",
                              )}
                            </span>
                          </div>
                        )}

                        {hasIncreased && (
                          <div className="flex items-center gap-1.5 mt-1 md:mt-2">
                            <span className="text-accentRed text-[10px] md:text-xs">
                              ▲
                            </span>
                            <span className="font-sans text-[9px] md:text-[10px] tracking-widest uppercase text-accentRed">
                              Up {priceDifference.toLocaleString("tr-TR")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex md:flex-1 justify-end items-center gap-3 md:gap-4">
                        <button
                          onClick={() => handleRemove(product.id)}
                          className="font-sans text-[9px] md:text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark bg-transparent border-none cursor-pointer px-1 py-2 hover:text-accentRed transition-colors duration-200 ease-smooth"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => navigate(`/product/${product.id}`)}
                          className="font-sans text-[9px] md:text-[10px] tracking-widest uppercase text-textPrimary dark:text-textPrimary-dark bg-transparent border border-borderLight dark:border-borderLight-dark cursor-pointer px-4 md:px-6 py-2 hover:bg-textPrimary dark:hover:bg-textPrimary-dark hover:text-bgPrimary dark:hover:text-bgPrimary-dark transition-all duration-200 ease-smooth"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
