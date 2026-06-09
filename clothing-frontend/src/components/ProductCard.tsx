import { useRef, useState, useCallback } from "react";
import { Product } from "../types";
import { Link } from "react-router-dom";
import { useCompare, MAX_COMPARE } from "../context/CompareContext";
import { ProductSkeleton } from "./ProductSkeleton";
import { PriceSparkline } from "./PriceSparkline";
import { useDispatch } from "react-redux";
import { toggleTrackedProductId } from "../store/productSlice";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { addToWatchlist, removeFromWatchlist } from "../services/api";

interface ProductCardProps {
  product: Product;
}

function discountPercent(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

function formatPrice(price: number): string {
  return price.toLocaleString("tr-TR");
}

function resolveVideoSrc(p: any): string | undefined {
  if (p.video) return p.video;
  if (p.videoUrl) return p.videoUrl;
  if (p.videos?.length) return p.videos[0];
  if (p.media?.length) {
    const hit = p.media.find(
      (m: any) => m.type === "video" || m.url?.includes("mp4"),
    );
    if (hit) return hit.url;
  }
  return undefined;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { compareList, addToCompare, removeFromCompare, isInCompare } =
    useCompare();
  const isComparing = isInCompare(product.id);
  // ✅ Fix: use MAX_COMPARE (3) instead of hardcoded 2
  const isQueueFull = compareList.length >= MAX_COMPARE && !isComparing;

  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const dispatch = useDispatch();
  const isTracked = useSelector((state: RootState) =>
    state.products.trackedProductIds.includes(product.id),
  );
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const hasHoverImage = product.images && product.images.length > 1;
  const videoSrc = resolveVideoSrc(product);

  const isOnSale =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;
  const discount = isOnSale
    ? discountPercent(product.originalPrice!, product.price)
    : 0;
  const previewPrices = (product.historyPreview ?? []).map((p: any) => p.price);

  const hasRealHistory =
    previewPrices.length >= 2 &&
    previewPrices.some((p: number) => p !== previewPrices[0]);

  const isAllTimeLow =
    hasRealHistory &&
    product.histMin != null &&
    product.histMin > 0 &&
    product.price <= product.histMin * 1.02;

  const handleMouseEnter = useCallback(() => {
    setIsPlaying(true);
    if (videoRef.current) videoRef.current.play().catch(() => {});
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const handleVideoToggle = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!videoRef.current) return;
      if (isPlaying) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    },
    [isPlaying],
  );

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast("Sign in to track prices", { icon: "🔒" });
      return;
    }

    if (!isTracked) {
      // Show price input — don't add to watchlist yet
      setShowPriceInput(true);
      setTimeout(() => priceInputRef.current?.focus(), 100);
    } else {
      // Remove from watchlist
      dispatch(toggleTrackedProductId(product.id));
      setShowPriceInput(false);
      setTargetPrice("");

      const success = await removeFromWatchlist(product.id);
      if (!success) {
        dispatch(toggleTrackedProductId(product.id));
        toast.error("Failed to remove from watchlist");
      } else {
        toast("Removed from watchlist", { icon: "🗑️" });
      }
    }
  };

  const handleSetTargetPrice = async (
    e: React.MouseEvent | React.KeyboardEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const tp = parseFloat(targetPrice);

    if (!targetPrice || isNaN(tp) || tp <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    // ✅ Fix: enforce price must be below current price
    if (tp >= product.price) {
      toast.error(
        `Target must be below current price (${formatPrice(product.price)} ${product.currency})`,
      );
      return;
    }

    setIsSubmittingPrice(true);
    try {
      const success = await addToWatchlist(product.id, tp);
      if (success) {
        dispatch(toggleTrackedProductId(product.id));
        setShowPriceInput(false);
        setTargetPrice("");
        toast.success(
          `Alert set — we'll notify you when it drops below ${formatPrice(tp)} ${product.currency}`,
        );
      } else {
        toast.error("Failed to set price alert");
      }
    } catch {
      toast.error("Failed to set price alert");
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  const handleSkipTargetPrice = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPriceInput(false);
    setTargetPrice("");

    const success = await addToWatchlist(product.id);
    if (success) {
      dispatch(toggleTrackedProductId(product.id));
      toast.success(`Added to watchlist`);
    } else {
      toast.error("Failed to add to watchlist");
    }
  };

  const showHoverImage = hasHoverImage && !videoSrc;

  return (
    <Link
      to={`/product/${encodeURIComponent(product.id)}`}
      className="group block no-underline cursor-pointer relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Image / Video ── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-skeletonBase dark:bg-bgHover-dark rounded-md">
        {!isImageLoaded && <ProductSkeleton isCardMode={true} />}

        {product.images && product.images.length > 0 && (
          <img
            src={product.images[0]}
            alt={product.name}
            onLoad={() => setIsImageLoaded(true)}
            className={[
              "absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-elegant",
              isImageLoaded
                ? "opacity-100 scale-100 blur-0"
                : "opacity-0 scale-[1.06] blur-md",
              (videoSrc && videoReady && isPlaying) ||
              (showHoverImage && isPlaying)
                ? "opacity-0"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        )}

        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="none"
            onLoadedData={() => setVideoReady(true)}
            className={[
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-elegant",
              videoReady && isPlaying ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        )}

        {showHoverImage && (
          <img
            src={product.images[1]}
            alt={`${product.name} alternate`}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-elegant opacity-0 scale-[1.08] group-hover:opacity-100 group-hover:scale-[1.03]"
          />
        )}

        {/* Compare button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (isComparing) removeFromCompare(product.id);
            else if (!isQueueFull) addToCompare(product);
          }}
          disabled={isQueueFull && !isComparing}
          className={[
            "absolute top-2 right-2 z-20 w-7 h-7 rounded-full border-none flex items-center justify-center shadow-md transition-all duration-300",
            isComparing
              ? "bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark cursor-pointer"
              : "bg-bgPrimary/95 dark:bg-bgPrimary-dark/90 text-textPrimary dark:text-textPrimary-dark",
            isQueueFull && !isComparing
              ? "opacity-40 cursor-not-allowed"
              : "cursor-pointer",
          ].join(" ")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3v18M3 12h18" />
          </svg>
        </button>

        {/* Sale badge */}
        {isOnSale && (
          <div className="absolute top-2 left-2 z-10 bg-accentRed text-white font-sans text-[8px] tracking-widest px-1.5 py-0.5 rounded-[2px]">
            −{discount}%
          </div>
        )}

        {/* All-time low badge */}
        {isAllTimeLow && !videoSrc && (
          <div className="absolute bottom-3 left-3 z-10 bg-black/75 backdrop-blur-sm text-white font-sans text-[7px] tracking-[0.18em] uppercase px-2 py-1 border border-white/15">
            All‑time low
          </div>
        )}

        {/* Mobile video play button */}
        {videoSrc && (
          <button
            onTouchStart={handleVideoToggle}
            onClick={(e) => e.preventDefault()}
            className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm font-sans text-[8px] tracking-widest uppercase text-white md:hidden"
          >
            {isPlaying ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-accentRed animate-pulse" />
                Playing
              </>
            ) : (
              <>
                <span>▶</span>
                Video
              </>
            )}
          </button>
        )}

        {/* ── Target price input ── */}
        {showPriceInput && (
          <div
            className="absolute bottom-12 right-2 z-30 flex animate-slide-up flex-col gap-2 bg-bgPrimary/98 dark:bg-bgPrimary-dark/98 backdrop-blur-md p-3 shadow-xl border border-black/8 dark:border-white/12 w-48"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-widest font-sans text-textPrimary dark:text-textPrimary-dark font-medium">
                  Set price alert
                </p>
                <p className="text-[9px] font-sans text-textMuted dark:text-textMuted-dark mt-0.5">
                  Must be below {formatPrice(product.price)} {product.currency}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                ref={priceInputRef}
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={String(Math.round(product.price * 0.9))}
                className="w-full border border-black/12 dark:border-white/20 bg-transparent py-1.5 px-2 text-xs text-textPrimary dark:text-textPrimary-dark focus:border-textPrimary dark:focus:border-textPrimary-dark focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleSetTargetPrice(e)}
              />
              <button
                onClick={handleSetTargetPrice}
                disabled={isSubmittingPrice}
                className="bg-textPrimary dark:bg-textPrimary-dark px-3 py-1.5 text-xs font-medium text-bgPrimary dark:text-bgPrimary-dark disabled:opacity-50 transition-opacity hover:opacity-80 whitespace-nowrap"
              >
                {isSubmittingPrice ? "…" : "Set"}
              </button>
            </div>

            <button
              onClick={handleSkipTargetPrice}
              className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark bg-transparent border-none cursor-pointer text-left hover:text-textSecondary dark:hover:text-textSecondary-dark transition-colors"
            >
              Skip, just watch →
            </button>
          </div>
        )}

        {/* ── Heart / watchlist button ── */}
        <button
          onClick={handleHeartClick}
          className={`absolute bottom-2 right-2 z-20 flex h-7 w-7 items-center justify-center shadow-md transition-all duration-300 md:opacity-0 md:group-hover:opacity-100 ${
            isTracked
              ? "bg-textPrimary dark:bg-textPrimary-dark"
              : "bg-bgPrimary/95 dark:bg-bgPrimary-dark/90 hover:bg-black/10 dark:hover:bg-white/10"
          } ${showPriceInput ? "md:opacity-100" : ""}`}
          aria-label={isTracked ? "Remove from watchlist" : "Add to watchlist"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill={isTracked ? "currentColor" : "none"}
            stroke={isTracked ? "none" : "currentColor"}
            strokeWidth="2"
            className={
              isTracked
                ? "text-bgPrimary dark:text-bgPrimary-dark"
                : "text-textPrimary dark:text-textPrimary-dark"
            }
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Desktop hover overlay */}
        <div className="hidden md:flex absolute bottom-0 left-0 right-0 pt-6 pb-3 px-3 bg-gradient-to-t from-black/30 to-transparent items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="font-sans text-[8px] tracking-widest uppercase text-white/90">
            View →
          </span>
          {videoSrc && isPlaying && (
            <span className="font-sans text-[8px] tracking-widest uppercase text-white/70 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-accentRed animate-pulse" />
              Video
            </span>
          )}
        </div>
      </div>

      {/* ── Info ── */}
      <div className="pt-2.5 pb-1">
        <p className="font-sans text-[9px] tracking-widest uppercase text-textSecondary dark:text-textSecondary-dark mb-0.5">
          {product.brand}
        </p>

        <p className="font-heading text-[14px] md:text-[16px] font-light italic text-textPrimary dark:text-textPrimary-dark mb-1 leading-tight truncate">
          {product.name
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")}
        </p>

        {/* Sparkline + price row */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <p
              className={[
                "font-heading text-[13px] md:text-[14px] m-0",
                isOnSale
                  ? "text-accentRed"
                  : "text-textTertiary dark:text-textTertiary-dark",
              ].join(" ")}
            >
              {formatPrice(product.price)} {product.currency}
            </p>

            {isOnSale && (
              <p className="font-heading text-[11px] text-textMuted dark:text-textMuted-dark line-through m-0">
                {formatPrice(product.originalPrice!)}
              </p>
            )}
          </div>
          {previewPrices.length >= 2 &&
            previewPrices.some((p) => p !== previewPrices[0]) && (
              <div className="flex-shrink-0 opacity-70">
                <PriceSparkline data={product.historyPreview ?? []} />
              </div>
            )}
        </div>
      </div>

      {/* Hover underline */}
      <div className="h-px w-full bg-textPrimary dark:bg-textPrimary-dark origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-smooth mt-1.5" />
    </Link>
  );
};

export default ProductCard;
