import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Product } from "../types";
import {
  fetchProductById,
  addToWatchlist,
  removeFromWatchlist,
  checkIsTracked,
} from "../services/api";
import { Spinner } from "../components/Spinner";
import ProductCard from "../components/ProductCard";
import PriceHistoryChart from "../components/PriceHistoryChart";
import { ImageLightbox } from "../components/ImageLightbox";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function discountPercent(original: number, current: number) {
  return Math.round(((original - current) / original) * 100);
}

// ─── Image grid layout engine ─────────────────────────────────────────────────
// Repeating 6-cell pattern — magazine-quality rhythm
function getGridClasses(idx: number): { colSpan: string; aspect: string } {
  const pattern = idx % 6;
  switch (pattern) {
    case 0:
      return { colSpan: "col-span-2", aspect: "aspect-video" }; // wide landscape
    case 1:
      return { colSpan: "col-span-1", aspect: "aspect-[3/4]" }; // tall left
    case 2:
      return { colSpan: "col-span-1", aspect: "aspect-[3/4]" }; // tall right
    case 3:
      return { colSpan: "col-span-1", aspect: "aspect-square" }; // square left
    case 4:
      return { colSpan: "col-span-1", aspect: "aspect-square" }; // square right
    case 5:
      return { colSpan: "col-span-2", aspect: "aspect-[21/9]" }; // ultra-wide cinematic
    default:
      return { colSpan: "col-span-1", aspect: "aspect-[3/4]" };
  }
}

// ─── Shared carousel classes (mirrors Home.tsx) ───────────────────────────────
const CAROUSEL =
  "flex gap-6 overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch]";
const CARD_WRAPPER =
  "min-w-[260px] max-w-[260px] flex-shrink-0 [scroll-snap-align:start]";

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = useSelector(
    (state: any) => state.auth.isAuthenticated,
  );

  // Reactively track Tailwind's `dark` class on <html> so chart re-renders on toggle
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [tracked, setTracked] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setSelectedSize(null);
    setHeroLoaded(false);
    fetchProductById(id)
      .then((data) => setProduct(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    checkIsTracked(id).then(setTracked);
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!id) return;
    fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products/${id}/related`,
    )
      .then((r) => r.json())
      .then(setRelatedProducts)
      .catch(console.error);
  }, [id]);

  const handleTrackPrice = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!product) return;
    setTrackLoading(true);
    try {
      if (tracked) {
        if (await removeFromWatchlist(product.id)) setTracked(false);
      } else {
        if (await addToWatchlist(product.id)) setTracked(true);
      }
    } finally {
      setTrackLoading(false);
    }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bgPrimary dark:bg-bgPrimary-dark">
        <Spinner />
      </div>
    );
  }

  // ── Not found ──
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bgPrimary dark:bg-bgPrimary-dark gap-4">
        <p className="font-heading text-3xl font-light italic text-textPrimary dark:text-textPrimary-dark">
          Product not found
        </p>
        <button
          onClick={() => navigate(-1)}
          className="font-sans text-[11px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark bg-transparent border-none cursor-pointer hover:opacity-60 transition-opacity duration-200"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const images = product.images ?? [];

  // Safely extract ALL possible video sources from Zara and Massimo schemas
  const videos: string[] = [];
  if (product.video) videos.push(product.video);
  if (product.videoUrl) videos.push(product.videoUrl);
  if (product.videos && product.videos.length > 0)
    videos.push(...product.videos);
  if (product.media && product.media.length > 0) {
    const mediaVideos = product.media
      .filter((m: any) => m.type === "video" || m.url?.includes("mp4"))
      .map((m: any) => m.url);
    videos.push(...mediaVideos);
  }

  const hasVideo = videos.length > 0;
  // Hero: first video if available, else first image
  const heroMedia = hasVideo
    ? { type: "video" as const, src: videos[0] }
    : images.length > 0
      ? { type: "image" as const, src: images[0] }
      : null;

  // Mixed media grid — remaining videos then all/remaining images
  const gridMedia: { type: "video" | "image"; src: string }[] = [];
  if (hasVideo) {
    videos
      .slice(1)
      .forEach((v: string) => gridMedia.push({ type: "video", src: v }));
    images.forEach((img) => gridMedia.push({ type: "image", src: img }));
  } else {
    images
      .slice(1)
      .forEach((img) => gridMedia.push({ type: "image", src: img }));
  }

  const isOnSale =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;
  const discount = isOnSale
    ? discountPercent(product.originalPrice!, product.price)
    : 0;

  return (
    <div className="bg-bgPrimary dark:bg-bgPrimary-dark min-h-screen">
      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIdx}
          onClose={() => setLightboxOpen(false)}
          setIndex={setLightboxIdx}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — CINEMATIC HERO
          ══════════════════════════════════════════════════════════ */}
      <div
        className={[
          "relative w-full h-screen overflow-hidden",
          heroMedia?.type === "image" ? "cursor-zoom-in" : "cursor-default",
        ].join(" ")}
        onClick={() => {
          if (heroMedia?.type === "image") {
            setLightboxIdx(images.indexOf(heroMedia.src));
            setLightboxOpen(true);
          }
        }}
      >
        {/* Hero media */}
        {heroMedia?.type === "video" ? (
          <video
            src={heroMedia.src}
            autoPlay
            muted
            loop
            playsInline
            onCanPlay={() => setHeroLoaded(true)}
            className={[
              "w-full h-full object-cover block",
              "transition-all duration-[1200ms] ease-elegant",
              heroLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.04]",
            ].join(" ")}
          />
        ) : heroMedia?.type === "image" ? (
          <img
            src={heroMedia.src}
            alt={product.name}
            onLoad={() => setHeroLoaded(true)}
            className={[
              "w-full h-full object-cover block",
              "transition-all duration-[1200ms] ease-elegant",
              heroLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.04]",
            ].join(" ")}
          />
        ) : null}

        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

        {/* Top-left: back button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(-1);
          }}
          className="absolute top-8 left-8 z-20 font-sans text-[9px] tracking-editorial uppercase text-white/60 hover:text-white/100 transition-colors duration-200 bg-transparent border-none cursor-pointer"
        >
          ← Back
        </button>

        {/* Top-right: sale badge */}
        {isOnSale && (
          <div className="absolute top-8 right-8 z-20 bg-accentRed text-white font-sans text-[9px] tracking-widest uppercase px-3 py-1.5">
            −{discount}%
          </div>
        )}

        {/* Video indicator */}
        {hasVideo && (
          <div className="absolute top-1/2 right-12 -translate-y-1/2 z-20 pointer-events-none">
            <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center">
              <span className="text-white/60 text-xs">▶</span>
            </div>
          </div>
        )}

        {/* ── Hero name overlay — bottom-left, slides up on load ── */}
        <div
          className={[
            "absolute bottom-12 left-12 z-20 pointer-events-none",
            "transition-all duration-700 ease-elegant",
            heroLoaded
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6",
          ].join(" ")}
        >
          {/* Brand overline */}
          <p className="font-sans text-[9px] tracking-editorial uppercase text-white/50 mb-3">
            {product.brand}
            {product.color && <span className="ml-3">· {product.color}</span>}
          </p>
          {/* Product name — large Cormorant italic */}
          <h1 className="font-heading font-light italic text-[clamp(32px,4vw,64px)] leading-none text-white max-w-2xl">
            {toTitleCase(product.name)}
          </h1>
          {/* Price beneath name */}
          <div className="flex items-baseline gap-3 mt-4">
            <span
              className={[
                "font-heading text-2xl",
                isOnSale ? "text-red-300" : "text-white/90",
              ].join(" ")}
            >
              {product.price.toLocaleString("tr-TR")} {product.currency}
            </span>
            {isOnSale && (
              <span className="font-heading text-lg text-white/30 line-through">
                {product.originalPrice!.toLocaleString("tr-TR")}
              </span>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className={[
            "absolute bottom-8 right-12 z-20 pointer-events-none",
            "transition-all duration-700 delay-500 ease-elegant",
            heroLoaded
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4",
          ].join(" ")}
        >
          <p className="font-sans text-[8px] tracking-editorial uppercase text-white/30">
            Scroll to explore
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — Two-column: mixed grid left + sticky info right
          ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-[55%_45%] items-start border-t border-borderLight dark:border-borderLight-dark">
        {/* ── LEFT: Asymmetric mixed media grid ── */}
        <div className="grid grid-cols-2 gap-[3px] bg-borderLight dark:bg-borderLight-dark border-r border-borderLight dark:border-borderLight-dark">
          {gridMedia.map((media, idx) => {
            const { colSpan, aspect } = getGridClasses(idx);
            const isImage = media.type === "image";
            return (
              <div
                key={idx}
                className={[
                  "group relative overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark",
                  colSpan,
                  aspect,
                  isImage ? "cursor-zoom-in" : "cursor-default",
                ].join(" ")}
                onClick={() => {
                  if (isImage) {
                    setLightboxIdx(images.indexOf(media.src));
                    setLightboxOpen(true);
                  }
                }}
              >
                {media.type === "video" ? (
                  <video
                    src={media.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover block transition-transform duration-700 ease-elegant"
                  />
                ) : (
                  <>
                    <img
                      src={media.src}
                      alt={`${product.name} view ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover block transition-transform duration-700 ease-elegant group-hover:scale-[1.03]"
                    />
                    {/* Zoom hint */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        className="opacity-70"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ── RIGHT: Sticky info panel — follows theme tokens ── */}
        <div
          ref={panelRef}
          className="sticky top-0 h-screen overflow-y-auto bg-bgPrimary dark:bg-bgPrimary-dark flex flex-col gap-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ padding: "52px 48px 52px 52px" }}
        >
          {/* Brand + color */}
          <p className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-4">
            {product.brand}
            {product.color && <span className="ml-3">· {product.color}</span>}
          </p>

          {/* Name */}
          <h2 className="font-heading font-light text-[clamp(24px,2.8vw,36px)] leading-[1.1] text-textPrimary dark:text-textPrimary-dark tracking-[-0.01em] mb-5">
            {toTitleCase(product.name)}
          </h2>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-7">
            <span
              className={[
                "font-heading text-[26px] font-normal",
                isOnSale
                  ? "text-accentRed"
                  : "text-textPrimary dark:text-textPrimary-dark",
              ].join(" ")}
            >
              {product.price.toLocaleString("tr-TR")} {product.currency}
            </span>
            {isOnSale && (
              <span className="font-heading text-[17px] text-textMuted dark:text-textMuted-dark line-through">
                {product.originalPrice!.toLocaleString("tr-TR")}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-borderLight dark:bg-borderLight-dark mb-6" />

          {/* Price history chart */}
          <div className="mb-6">
            <PriceHistoryChart
              history={product.priceHistory}
              currentPrice={product.price}
              originalPrice={product.originalPrice}
              currency={product.currency}
              theme={isDarkMode ? "dark" : "light"}
            />
          </div>

          {/* Track price button */}
          <button
            onClick={handleTrackPrice}
            disabled={trackLoading}
            className={[
              "w-full py-3.5 mb-2.5 border font-sans text-[10px] tracking-[0.18em] uppercase",
              "flex items-center justify-center gap-2 cursor-pointer",
              "transition-all duration-200 ease-smooth",
              trackLoading ? "opacity-50 cursor-wait" : "",
              tracked
                ? "bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-textPrimary dark:border-textPrimary-dark"
                : "bg-transparent text-textTertiary dark:text-textTertiary-dark border-borderLight dark:border-borderLight-dark hover:bg-textPrimary dark:hover:bg-textPrimary-dark hover:text-bgPrimary dark:hover:text-bgPrimary-dark hover:border-textPrimary dark:hover:border-textPrimary-dark",
            ].join(" ")}
          >
            <span>{tracked ? "✓" : "♡"}</span>
            {trackLoading
              ? "…"
              : tracked
                ? "Tracking price"
                : isAuthenticated
                  ? "Track price drop"
                  : "Sign in to track"}
          </button>

          {/* View on brand button */}
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3.5 mb-8 bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[10px] tracking-[0.22em] uppercase text-center no-underline font-medium transition-opacity duration-200 hover:opacity-80"
          >
            View on {product.brand} →
          </a>

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-7">
              <p className="font-sans text-[8px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2.5">
                Available sizes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.sizes.map((size, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setSelectedSize(size === selectedSize ? null : size)
                    }
                    className={[
                      "font-sans text-[11px] px-3.5 py-2 border cursor-pointer",
                      "transition-all duration-150 ease-smooth",
                      selectedSize === size
                        ? "bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-textPrimary dark:border-textPrimary-dark"
                        : "bg-transparent text-textTertiary dark:text-textTertiary-dark border-borderLight dark:border-borderLight-dark hover:bg-textPrimary dark:hover:bg-textPrimary-dark hover:text-bgPrimary dark:hover:text-bgPrimary-dark hover:border-textPrimary dark:hover:border-textPrimary-dark",
                    ].join(" ")}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-borderLight dark:bg-borderLight-dark mb-6" />

          {/* Description */}
          {product.description && (
            <div className="mb-5">
              <p className="font-sans text-[8px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2.5">
                About this piece
              </p>
              <p className="font-heading text-[15px] font-light italic leading-[1.75] text-textTertiary dark:text-textTertiary-dark m-0">
                {product.description}
              </p>
            </div>
          )}

          {/* Composition */}
          {product.composition && (
            <div className="mb-5">
              <p className="font-sans text-[8px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-2.5">
                Composition
              </p>
              <p className="font-sans text-[11px] leading-[1.8] text-textTertiary dark:text-textTertiary-dark m-0">
                {product.composition}
              </p>
            </div>
          )}

          {/* ── Mini thumbnails footer ── */}
          <div className="mt-auto pt-6 border-t border-borderLight dark:border-borderLight-dark">
            <p className="font-sans text-[8px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark mb-3">
              {images.length} image{images.length !== 1 ? "s" : ""}
              {(product as any).videos?.length > 0 ? " + video" : ""}
            </p>
            <div className="flex gap-[3px]">
              {images.slice(0, 6).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setLightboxIdx(idx);
                    setLightboxOpen(true);
                  }}
                  className="flex-shrink-0 w-10 h-[52px] overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark border border-borderLight dark:border-borderLight-dark p-0 cursor-zoom-in transition-all duration-200 hover:border-borderDark dark:hover:border-borderDark-dark"
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              {images.length > 6 && (
                <div className="flex-shrink-0 w-10 h-[52px] bg-bgSecondary dark:bg-bgSecondary-dark border border-borderLight dark:border-borderLight-dark flex items-center justify-center">
                  <span className="font-sans text-[9px] text-textMuted dark:text-textMuted-dark">
                    +{images.length - 6}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — Related products (horizontal carousel)
          ══════════════════════════════════════════════════════════ */}
      {relatedProducts.length > 0 && (
        <section className="bg-bgPrimary dark:bg-bgPrimary-dark px-16 py-20 border-t border-borderLight dark:border-borderLight-dark">
          <div className="flex justify-between items-baseline mb-10 border-b border-borderLight dark:border-borderLight-dark pb-5">
            <div className="flex items-baseline gap-4">
              <h2 className="font-heading font-light text-[28px] text-textPrimary dark:text-textPrimary-dark">
                You may also like
              </h2>
              <span className="font-sans text-[9px] tracking-editorial uppercase text-textMuted dark:text-textMuted-dark">
                Related pieces
              </span>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="font-sans text-[10px] tracking-widest uppercase text-textTertiary dark:text-textTertiary-dark bg-transparent border-none cursor-pointer hover:opacity-50 transition-opacity duration-200 ease-smooth"
            >
              ← Back to results
            </button>
          </div>
          <div className={CAROUSEL}>
            {relatedProducts.slice(0, 8).map((p) => (
              <div key={p.id} className={CARD_WRAPPER}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
