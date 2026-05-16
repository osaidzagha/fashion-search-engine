import { useRef, useState } from "react";
import { Product } from "../types";
import { Link } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import { ProductSkeleton } from "./ProductSkeleton";

interface ProductCardProps {
  product: Product;
}

function discountPercent(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
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
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { compareList, addToCompare, removeFromCompare, isInCompare } =
    useCompare();
  const isComparing = isInCompare(product.id);
  const isQueueFull = compareList.length >= 2 && !isComparing;

  const hasHoverImage = product.images && product.images.length > 1;
  const videoSrc = resolveVideoSrc(product);

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

  const showHoverImage = hasHoverImage && !videoSrc;

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block no-underline cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Image / Video ── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-skeletonBase dark:bg-bgHover-dark">
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
              (videoSrc && videoReady && hovered) || (showHoverImage && hovered)
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
            preload="metadata"
            onLoadedData={() => setVideoReady(true)}
            className={[
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-elegant",
              videoReady && hovered ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        )}

        {showHoverImage && (
          <img
            src={product.images[1]}
            alt={`${product.name} alternate`}
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
              : "bg-bgPrimary/90 dark:bg-bgPrimary-dark/90 text-textPrimary dark:text-textPrimary-dark",
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

        {/* Hover overlay — desktop only meaningful, fine on mobile */}
        <div className="absolute bottom-0 left-0 right-0 pt-6 pb-3 px-3 bg-gradient-to-t from-black/30 to-transparent flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="font-sans text-[8px] tracking-widest uppercase text-white/90">
            View →
          </span>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="pt-2.5 pb-1">
        <p className="font-sans text-[8px] tracking-widest uppercase text-textSecondary dark:text-textSecondary-dark mb-0.5">
          {product.brand}
        </p>
        <p className="font-heading text-[14px] md:text-[16px] font-light italic text-textPrimary dark:text-textPrimary-dark mb-1 leading-tight truncate">
          {product.name
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")}
        </p>
        <div className="flex items-baseline gap-1.5">
          <p
            className={[
              "font-heading text-[13px] md:text-[14px] m-0",
              isOnSale
                ? "text-accentRed"
                : "text-textTertiary dark:text-textTertiary-dark",
            ].join(" ")}
          >
            {product.price.toLocaleString("tr-TR")} {product.currency}
          </p>
          {isOnSale && (
            <p className="font-heading text-[11px] text-textMuted dark:text-textMuted-dark line-through m-0">
              {product.originalPrice!.toLocaleString("tr-TR")}
            </p>
          )}
        </div>
      </div>

      <div className="h-px w-full bg-textPrimary dark:bg-textPrimary-dark origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-smooth mt-1.5" />
    </Link>
  );
};

export default ProductCard;
