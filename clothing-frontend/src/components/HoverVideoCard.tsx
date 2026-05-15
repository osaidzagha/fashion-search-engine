import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";

interface HoverVideoCardProps {
  product: Product;
}

export default function HoverVideoCard({ product }: HoverVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isActive, setIsActive] = useState(false); // Replaces "hovered" to support touch
  const navigate = useNavigate();

  const videoSrc: string | undefined =
    (product as any).video ||
    (product as any).videoUrl ||
    ((product as any).videos?.length ? (product as any).videos[0] : undefined);

  // Use Intersection Observer for Mobile Autoplay
  useEffect(() => {
    // If it's a desktop device with hover capability, don't use the observer
    if (window.matchMedia("(hover: hover)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsActive(true);
            videoRef.current?.play().catch(() => {});
          } else {
            setIsActive(false);
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          }
        });
      },
      { threshold: 0.6 }, // Play when 60% of the card is visible
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = () => {
    // Only run hover logic on devices that support it
    if (!window.matchMedia("(hover: hover)").matches) return;
    setIsActive(true);
    if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    setIsActive(false);
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
      ref={containerRef}
      className="group relative flex-shrink-0 w-[220px] md:w-[260px] cursor-pointer overflow-hidden [scroll-snap-align:start]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => product.id && navigate(`/product/${product.id}`)}
    >
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={product.name || "Product"}
            className={[
              "absolute inset-0 w-full h-full object-cover",
              "transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
              "group-hover:scale-[1.03]",
              videoSrc && videoReady && isActive ? "opacity-0" : "opacity-100",
            ].join(" ")}
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
              "absolute inset-0 w-full h-full object-cover",
              "transition-opacity duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
              videoReady && isActive ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        )}

        <div
          className={[
            "absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent",
            "transition-opacity duration-500",
            isActive ? "opacity-100" : "opacity-50",
          ].join(" ")}
        />

        <div
          className={[
            "absolute bottom-0 left-0 right-0 px-4 pb-4 md:px-5 md:pb-5 pt-10",
            "transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
            // On mobile (no hover), always show the text. On desktop, slide it up.
            "translate-y-0 opacity-100 md:translate-y-4 md:opacity-0",
            isActive ? "md:translate-y-0 md:opacity-100" : "",
          ].join(" ")}
        >
          <p className="font-sans text-[8px] md:text-[9px] tracking-widest uppercase text-white/60 mb-1.5 md:mb-2">
            {(product as any).brand || ""}
          </p>

          <h3 className="font-heading italic text-base md:text-lg leading-snug text-white mb-2 md:mb-3 line-clamp-2">
            {product.name}
          </h3>

          <div className="flex items-baseline gap-2">
            <span className="font-sans text-xs md:text-sm text-white/90">
              {typeof product.price === "number"
                ? `${product.price.toLocaleString("tr-TR")} TL`
                : product.price}
            </span>
            {product.originalPrice && product.price < product.originalPrice && (
              <span className="font-sans text-[10px] md:text-xs text-white/40 line-through">
                {typeof product.originalPrice === "number"
                  ? `${product.originalPrice.toLocaleString("tr-TR")} TL`
                  : product.originalPrice}
              </span>
            )}
          </div>
        </div>

        {videoSrc && (
          <span
            className={[
              "absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1.5 px-2 py-1",
              "bg-black/50 backdrop-blur-sm",
              "font-sans text-[8px] tracking-widest uppercase text-white",
              "transition-opacity duration-300",
              isActive ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accentRed animate-pulse" />
            Video
          </span>
        )}

        {discountPct && (
          <span className="absolute top-2 right-2 md:top-3 md:right-3 px-2 py-1 bg-accentRed font-sans text-[8px] md:text-[9px] tracking-widest uppercase text-white">
            -{discountPct}%
          </span>
        )}

        <div
          className={[
            "absolute inset-0 border transition-all duration-500 pointer-events-none",
            isActive
              ? "border-white/10 opacity-100"
              : "border-transparent opacity-0",
          ].join(" ")}
        />
      </div>
    </article>
  );
}
