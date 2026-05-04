import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";

interface HoverVideoCardProps {
  product: Product;
}

export default function HoverVideoCard({ product }: HoverVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  // Defensive: resolve video URL from any of the three possible field shapes
  const videoSrc: string | undefined =
    (product as any).video ||
    (product as any).videoUrl ||
    ((product as any).videos?.length ? (product as any).videos[0] : undefined);

  const handleMouseEnter = () => {
    setHovered(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const thumbnail = product.images?.[0] || "";

  const discountPct =
    product.originalPrice && product.price < product.originalPrice
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : null;

  return (
    <article
      className="group relative flex-shrink-0 w-[260px] cursor-pointer overflow-hidden [scroll-snap-align:start]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => product.id && navigate(`/product/${product.id}`)}
    >
      {/* ── Cinematic 2:3 media frame ─────────────────────────────────────── */}
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark">
        {/* Static thumbnail — base state */}
        {thumbnail && (
          <img
            src={thumbnail}
            alt={product.name || "Product"}
            className={[
              "absolute inset-0 w-full h-full object-cover",
              "transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
              "group-hover:scale-[1.03]",
              // Fade out only when video has loaded AND we're hovering
              videoSrc && videoReady && hovered ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />
        )}

        {/* Video — crossfades in over thumbnail once loaded + hovered */}
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
              "transition-opacity duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
              videoReady && hovered ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        )}

        {/* Gradient scrim — always present, deepens on hover for text legibility */}
        <div
          className={[
            "absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent",
            "transition-opacity duration-500",
            hovered ? "opacity-100" : "opacity-50",
          ].join(" ")}
        />

        {/* ── Slide-up text reveal ─────────────────────────────────────────── */}
        <div
          className={[
            "absolute bottom-0 left-0 right-0 px-5 pb-5 pt-10",
            "transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
            hovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          ].join(" ")}
        >
          {/* Brand — per spec: font-sans text-[9px] uppercase tracking-widest */}
          <p className="font-sans text-[9px] tracking-widest uppercase text-white/60 mb-2">
            {(product as any).brand || ""}
          </p>

          {/* Name — per spec: font-heading italic text-lg */}
          <h3 className="font-heading italic text-lg leading-snug text-white mb-3 line-clamp-2">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-sm text-white/90">
              {typeof product.price === "number"
                ? `${product.price.toLocaleString("tr-TR")} TL`
                : product.price}
            </span>
            {product.originalPrice && product.price < product.originalPrice && (
              <span className="font-sans text-xs text-white/40 line-through">
                {typeof product.originalPrice === "number"
                  ? `${product.originalPrice.toLocaleString("tr-TR")} TL`
                  : product.originalPrice}
              </span>
            )}
          </div>
        </div>

        {/* Video indicator badge — appears on hover */}
        {videoSrc && (
          <span
            className={[
              "absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1",
              "bg-black/50 backdrop-blur-sm",
              "font-sans text-[8px] tracking-widest uppercase text-white",
              "transition-opacity duration-300",
              hovered ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accentRed animate-pulse" />
            Video
          </span>
        )}

        {/* Discount badge */}
        {discountPct && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-accentRed font-sans text-[9px] tracking-widest uppercase text-white">
            -{discountPct}%
          </span>
        )}

        {/* Subtle inset border on hover */}
        <div
          className={[
            "absolute inset-0 border transition-all duration-500 pointer-events-none",
            hovered
              ? "border-white/10 opacity-100"
              : "border-transparent opacity-0",
          ].join(" ")}
        />
      </div>
    </article>
  );
}
