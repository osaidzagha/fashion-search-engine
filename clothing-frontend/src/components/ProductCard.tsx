import { useRef, useState } from "react";
import { Product } from "../types";
import { Link } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import { ProductSkeleton } from "./ProductSkeleton";

interface ProductCardProps {
  product: Product;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function discountPercent(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

/** Resolves a video URL from any of the four possible field shapes. */
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

// ── Component ─────────────────────────────────────────────────────────────────

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { compareList, addToCompare, removeFromCompare, isInCompare } =
    useCompare();

  const isComparing = isInCompare(product.id);
  const isQueueFull = compareList.length >= 2 && !isComparing;

  const hasHoverImage = product.images && product.images.length > 1;
  const videoSrc = resolveVideoSrc(product);

  // Sale logic
  const isOnSale =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;
  const discount = isOnSale
    ? discountPercent(product.originalPrice!, product.price)
    : 0;

  const handleMouseEnter = () => {
    setHovered(true);
    if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // When a video exists, suppress the static hover-image crossfade
  const showHoverImage = hasHoverImage && !videoSrc;

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block no-underline cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Image / Video Container ───────────────────────────────────────── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-skeletonBase dark:bg-bgHover-dark transition-colors duration-500 ease-smooth">
        {/* Skeleton base layer */}
        {!isImageLoaded && <ProductSkeleton isCardMode={true} />}

        {/* Primary image */}
        {product.images && product.images.length > 0 && (
          <img
            src={product.images[0]}
            alt={product.name}
            onLoad={() => setIsImageLoaded(true)}
            className={[
              "absolute inset-0 w-full h-full object-cover",
              "transition-all duration-700 ease-elegant",
              isImageLoaded
                ? "opacity-100 scale-100 blur-0"
                : "opacity-0 scale-[1.06] blur-md",
              // Fade out on hover — hand off to video if available, else hover image
              (videoSrc && videoReady && hovered) || (showHoverImage && hovered)
                ? "opacity-0"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        )}

        {/* ── Video layer — crossfades over primary image on hover ── */}
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => setVideoReady(true)}
            className={[
              "absolute inset-0 w-full h-full object-cover",
              "transition-opacity duration-700 ease-elegant",
              videoReady && hovered ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        )}

        {/* Static hover image (only when no video) */}
        {showHoverImage && (
          <img
            src={product.images[1]}
            alt={`${product.name} alternate view`}
            className="
              absolute inset-0 w-full h-full object-cover
              transition-all duration-700 ease-elegant
              opacity-0 scale-[1.08]
              group-hover:opacity-100 group-hover:scale-[1.03]
            "
          />
        )}

        {/* Compare button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (isComparing) {
              removeFromCompare(product.id);
            } else if (!isQueueFull) {
              addToCompare(product);
            }
          }}
          disabled={isQueueFull && !isComparing}
          title={isComparing ? "Remove from Compare" : "Add to Compare"}
          className={[
            "absolute top-3 right-3 z-20 w-8 h-8 rounded-full border-none",
            "flex items-center justify-center shadow-premium dark:shadow-premium-dark",
            "transition-all duration-300 ease-smooth",
            isComparing
              ? "bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark cursor-pointer"
              : "bg-bgPrimary/90 dark:bg-bgPrimary-dark/90 text-textPrimary dark:text-textPrimary-dark hover:bg-bgHover dark:hover:bg-bgSecondary-dark",
            isQueueFull && !isComparing
              ? "opacity-40 cursor-not-allowed"
              : "cursor-pointer opacity-100",
          ].join(" ")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3v18M3 12h18" />
          </svg>
        </button>

        {/* Sale badge — top left */}
        {isOnSale && (
          <div className="absolute top-3 left-3 z-10 bg-accentRed text-white font-sans text-[9px] tracking-widest px-2 py-1 rounded-[2px]">
            −{discount}%
          </div>
        )}

        {/* Video indicator badge — visible on hover when playing */}
        {videoSrc && hovered && (
          <span className="absolute bottom-10 left-3 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-sm font-sans text-[8px] tracking-widest uppercase text-white transition-opacity duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-accentRed animate-pulse" />
            Video
          </span>
        )}

        {/* Brand badge — appears on hover */}
        <div
          className={[
            "absolute left-3 z-[5] bg-bgPrimary/90 dark:bg-bgPrimary-dark/90 backdrop-blur-sm",
            "px-2 py-1 transition-all duration-300 ease-smooth",
            "opacity-0 group-hover:opacity-100",
            isOnSale ? "top-10" : "top-3",
          ].join(" ")}
        >
          <span className="font-sans text-[9px] tracking-[0.14em] uppercase text-textPrimary dark:text-textPrimary-dark">
            {product.brand}
          </span>
        </div>

        {/* Quick view hint — bottom gradient on hover */}
        <div className="absolute bottom-0 left-0 right-0 pt-8 pb-3.5 px-3.5 bg-gradient-to-t from-black/30 dark:from-black/50 to-transparent flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-400 ease-smooth">
          <span className="font-sans text-[9px] tracking-[0.12em] uppercase text-white/95">
            View details →
          </span>
          {showHoverImage && (
            <span className="font-sans text-[9px] text-white/70">
              {product.images.length} photos
            </span>
          )}
          {videoSrc && (
            <span className="font-sans text-[9px] text-white/70">
              {product.images.length} photos
            </span>
          )}
        </div>
      </div>

      {/* ── Info below card ───────────────────────────────────────────────── */}
      <div className="pt-3 pb-1">
        <p className="font-sans text-[9px] tracking-[0.14em] uppercase text-textSecondary dark:text-textSecondary-dark m-0 mb-1 transition-colors duration-500 ease-smooth">
          {product.brand}
        </p>

        <p className="font-heading text-[17px] font-light italic text-textPrimary dark:text-textPrimary-dark m-0 mb-1.5 leading-tight truncate transition-colors duration-500 ease-smooth">
          {product.name
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")}
        </p>

        <div className="flex items-baseline gap-2">
          <p
            className={[
              "font-heading text-[15px] font-normal m-0 transition-colors duration-500 ease-smooth",
              isOnSale
                ? "text-accentRed"
                : "text-textTertiary dark:text-textTertiary-dark",
            ].join(" ")}
          >
            {product.price.toLocaleString("tr-TR")} {product.currency}
          </p>
          {isOnSale && (
            <p className="font-heading text-[13px] text-textMuted dark:text-textMuted-dark line-through m-0 transition-colors duration-500 ease-smooth">
              {product.originalPrice!.toLocaleString("tr-TR")}
            </p>
          )}
        </div>
      </div>

      {/* Hover underline accent */}
      <div className="h-[1px] w-full bg-textPrimary dark:bg-textPrimary-dark origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-smooth mt-2" />
    </Link>
  );
};

export default ProductCard;
