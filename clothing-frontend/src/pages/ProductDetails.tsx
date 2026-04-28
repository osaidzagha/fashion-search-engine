import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Product } from "../types";

import {
  fetchProductById,
  addToWatchlist,
  removeFromWatchlist,
  fetchRelatedProducts,
  checkIsTracked,
} from "../services/api";
import { Spinner } from "../components/Spinner";
import ProductCard from "../components/ProductCard";
import PriceHistoryChart from "../components/PriceHistoryChart";
import { ImageLightbox } from "../components/ImageLightbox";

// ─── CSS ──────────────────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("pd-styles")) {
  const s = document.createElement("style");
  s.id = "pd-styles";
  s.textContent = `
    @keyframes pd-heroIn {
      from { opacity: 0; transform: scale(1.04); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes pd-slideUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pd-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .pd-grid-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .pd-grid-cell:hover .pd-grid-img { transform: scale(1.03); }
    .pd-grid-cell:hover .pd-zoom-hint { opacity: 1 !important; }
    .pd-track-btn:hover { background: #1a1a1a !important; color: #fff !important; border-color: #1a1a1a !important; }
    .pd-size-btn:hover { background: #1a1a1a !important; color: #fff !important; border-color: #1a1a1a !important; }
    .pd-back-btn:hover { color: #1a1a1a !important; }
    .pd-view-btn:hover { background: #333 !important; }
    /* Hide scrollbar in panel */
    .pd-panel::-webkit-scrollbar { display: none; }
    .pd-panel { -ms-overflow-style: none; scrollbar-width: none; }
  `;
  document.head.appendChild(s);
}

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
// Repeating 6-cell pattern that creates a magazine-quality rhythm
function getGridStyle(idx: number): {
  gridColumn: string;
  aspectRatio: string;
} {
  const pattern = idx % 6;
  switch (pattern) {
    case 0:
      return { gridColumn: "1 / 3", aspectRatio: "16 / 9" }; // wide landscape
    case 1:
      return { gridColumn: "1 / 2", aspectRatio: "3 / 4" }; // tall left
    case 2:
      return { gridColumn: "2 / 3", aspectRatio: "3 / 4" }; // tall right
    case 3:
      return { gridColumn: "1 / 2", aspectRatio: "1 / 1" }; // square left
    case 4:
      return { gridColumn: "2 / 3", aspectRatio: "1 / 1" }; // square right
    case 5:
      return { gridColumn: "1 / 3", aspectRatio: "21 / 9" }; // ultra-wide cinematic
    default:
      return { gridColumn: "auto", aspectRatio: "3 / 4" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = useSelector(
    (state: any) => state.auth.isAuthenticated,
  );

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [tracked, setTracked] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToWatchlist = async () => {
    if (!product) return;
    setIsSaving(true);
    try {
      const success = await addToWatchlist(product.id);
      if (success) {
        setIsSaved(true);
      } else {
        alert("Failed to save to Watchlist. Check your console!");
      }
    } catch (error) {
      console.error("Failed to track item", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setSelectedSize(null);
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
    fetch(`http://localhost:5000/api/products/${id}/related`)
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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#f0ede6",
        }}
      >
        <Spinner />
      </div>
    );
  }

  // ── Not found ──
  if (!product) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#f0ede6",
          gap: "16px",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "32px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#1a1a1a",
          }}
        >
          Product not found
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#888",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          ← Go back
        </button>
      </div>
    );
  }

  const images = product.images ?? [];
  const hasVideo = !!product.video;

  // If we have a video, the Hero is the video, and ALL images go to the grid.
  // If we don't have a video, Hero gets the 1st image, and the grid gets the rest.
  const gridImages = hasVideo ? images : images.slice(1);
  const heroImg = hasVideo ? null : images[0] || null;

  const isOnSale =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;
  const discount = isOnSale
    ? discountPercent(product.originalPrice!, product.price)
    : 0;

  return (
    <div style={{ background: "#f0ede6", minHeight: "100vh" }}>
      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIdx}
          onClose={() => setLightboxOpen(false)}
          setIndex={setLightboxIdx}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          SECTION 1: CINEMATIC HERO — full viewport, image fills
          ════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
          cursor: "zoom-in",
        }}
        onClick={() => {
          setLightboxIdx(0);
          setLightboxOpen(true);
        }}
      >
        {/* Dynamic Hero: Video priority, Image fallback */}
        {hasVideo ? (
          <video
            src={product.video}
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              animation:
                "pd-heroIn 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
            }}
          />
        ) : heroImg ? (
          <img
            src={heroImg}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              animation:
                "pd-heroIn 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
            }}
          />
        ) : null}

        {/* Gradient overlay — bottom */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 30%, transparent 50%, rgba(0,0,0,0.55) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 40px",
            pointerEvents: "all",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="pd-back-btn"
            onClick={() => navigate(-1)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.8)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "color 0.2s ease",
              backdropFilter: "blur(0px)",
            }}
          >
            ← Back
          </button>

          {/* Sale badge */}
          {isOnSale && (
            <div
              style={{
                background: "#b94040",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                padding: "5px 12px",
              }}
            >
              −{discount}% SALE
            </div>
          )}

          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {product.brand}
          </span>
        </div>

        {/* Bottom: big product name overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "40px 48px 44px",
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              margin: "0 0 8px",
              animation: "pd-slideUp 0.8s ease 0.4s both",
            }}
          >
            {product.color || "New arrival"}
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: "clamp(36px, 5.5vw, 80px)",
              lineHeight: 1.0,
              color: "#fff",
              margin: "0 0 20px",
              letterSpacing: "-0.01em",
              animation: "pd-slideUp 0.8s ease 0.5s both",
              maxWidth: "70%",
            }}
          >
            {toTitleCase(product.name)}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "14px",
              animation: "pd-slideUp 0.8s ease 0.6s both",
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 400,
                color: isOnSale ? "#f08080" : "#fff",
              }}
            >
              {product.price.toLocaleString("tr-TR")} {product.currency}
            </span>
            {isOnSale && (
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "18px",
                  color: "rgba(255,255,255,0.4)",
                  textDecoration: "line-through",
                }}
              >
                {product.originalPrice!.toLocaleString("tr-TR")}
              </span>
            )}
          </div>
        </div>

        {/* Scroll cue */}
        <div
          style={{
            position: "absolute",
            bottom: "44px",
            right: "48px",
            pointerEvents: "none",
            animation: "pd-fadeIn 1s ease 1.2s both",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "8px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              margin: 0,
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            Scroll to explore
          </p>
        </div>

        {/* Video badge if product has video */}
        {product.video && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: "48px",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}
              >
                ▶
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 2: Two-column — image grid left, sticky info right
          ════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "55% 45%",
          alignItems: "start",
          borderTop: "1px solid #e0ddd8",
        }}
      >
        {/* ── LEFT: Asymmetric image grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "3px",
            background: "#e0ddd8", // gap color
            borderRight: "1px solid #e0ddd8",
          }}
        >
          {/* Grid images */}
          {gridImages.map((img, idx) => {
            const { gridColumn, aspectRatio } = getGridStyle(idx);
            return (
              <div
                key={idx}
                className="pd-grid-cell"
                style={{
                  gridColumn,
                  aspectRatio,
                  overflow: "hidden",
                  background: "#e8e4dc",
                  cursor: "zoom-in",
                  position: "relative",
                }}
                onClick={() => {
                  setLightboxIdx(idx + 1); // +1 because hero is idx 0
                  setLightboxOpen(true);
                }}
              >
                <img
                  className="pd-grid-img"
                  src={img}
                  alt={`${product.name} view ${idx + 2}`}
                  loading="lazy"
                />
                {/* Zoom hint overlay */}
                <div
                  className="pd-zoom-hint"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle
                      cx="14"
                      cy="14"
                      r="13"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="1"
                    />
                    <line
                      x1="10"
                      y1="14"
                      x2="18"
                      y2="14"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                    <line
                      x1="14"
                      y1="10"
                      x2="14"
                      y2="18"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Image counter */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "12px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "8px",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {idx + 2} / {images.length}
                </div>
              </div>
            );
          })}

          {/* If only 1 image total, show a placeholder */}
          {images.length === 1 && (
            <div
              style={{
                gridColumn: "1 / 3",
                padding: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f0ede6",
              }}
            >
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "18px",
                  color: "#c0bdb8",
                }}
              >
                Single image product
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Sticky dark info panel ── */}
        <div
          ref={panelRef}
          className="pd-panel"
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
            background: "#0f0f0d",
            color: "#f0ede6",
            padding: "52px 48px 52px 52px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            animation: "pd-fadeIn 0.6s ease 0.8s both",
          }}
        >
          {/* Brand + color */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#5a5754",
              margin: "0 0 16px",
            }}
          >
            {product.brand}
            {product.color && (
              <span style={{ marginLeft: "12px" }}>· {product.color}</span>
            )}
          </p>

          {/* Name */}
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: "clamp(24px, 2.8vw, 36px)",
              lineHeight: 1.1,
              color: "#f0ede6",
              margin: "0 0 20px",
              letterSpacing: "-0.01em",
            }}
          >
            {toTitleCase(product.name)}
          </h2>

          {/* Price */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "12px",
              marginBottom: "28px",
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "26px",
                fontWeight: 400,
                color: isOnSale ? "#f08080" : "#f0ede6",
              }}
            >
              {product.price.toLocaleString("tr-TR")} {product.currency}
            </span>
            {isOnSale && (
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "17px",
                  color: "#3a3734",
                  textDecoration: "line-through",
                }}
              >
                {product.originalPrice!.toLocaleString("tr-TR")}
              </span>
            )}
          </div>

          <div
            style={{
              height: "1px",
              background: "#1e1e1c",
              marginBottom: "24px",
            }}
          />

          {/* Price history chart */}
          <div style={{ marginBottom: "24px" }}>
            <PriceHistoryChart
              history={product.priceHistory}
              currentPrice={product.price}
              originalPrice={product.originalPrice} // 👈 Feeds the red "Retail" line
              currency={product.currency}
              theme="dark" // 👈 Triggers the dark-mode colors
            />
          </div>

          {/* Track price */}
          <button
            className="pd-track-btn"
            onClick={handleTrackPrice}
            disabled={trackLoading}
            style={{
              width: "100%",
              padding: "13px",
              marginBottom: "10px",
              background: tracked ? "#f0ede6" : "transparent",
              border: "1px solid",
              borderColor: tracked ? "#f0ede6" : "#2e2e2c",
              cursor: trackLoading ? "wait" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: tracked ? "#0f0f0d" : "#5a5754",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: trackLoading ? 0.5 : 1,
            }}
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

          {/* View on brand */}
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="pd-view-btn"
            style={{
              display: "block",
              width: "100%",
              padding: "14px",
              background: "#f0ede6",
              color: "#0f0f0d",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              textAlign: "center",
              textDecoration: "none",
              marginBottom: "32px",
              transition: "background 0.2s ease",
              fontWeight: 500,
            }}
          >
            View on {product.brand} →
          </a>

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "8px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#3a3734",
                  margin: "0 0 10px",
                }}
              >
                Available sizes
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {product.sizes.map((size, i) => (
                  <button
                    key={i}
                    className="pd-size-btn"
                    onClick={() =>
                      setSelectedSize(size === selectedSize ? null : size)
                    }
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "11px",
                      padding: "7px 13px",
                      border: "1px solid",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      borderColor:
                        selectedSize === size ? "#f0ede6" : "#2e2e2c",
                      background:
                        selectedSize === size ? "#f0ede6" : "transparent",
                      color: selectedSize === size ? "#0f0f0d" : "#5a5754",
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              height: "1px",
              background: "#1e1e1c",
              marginBottom: "24px",
            }}
          />

          {/* Description */}
          {product.description && (
            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "8px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#3a3734",
                  margin: "0 0 10px",
                }}
              >
                About this piece
              </p>
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "15px",
                  fontWeight: 300,
                  lineHeight: 1.75,
                  color: "#8a8784",
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                {product.description}
              </p>
            </div>
          )}

          {/* Composition */}
          {product.composition && (
            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "8px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#3a3734",
                  margin: "0 0 10px",
                }}
              >
                Composition
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  lineHeight: 1.8,
                  color: "#5a5754",
                  margin: 0,
                }}
              >
                {product.composition}
              </p>
            </div>
          )}

          {/* Image count at bottom */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "24px",
              borderTop: "1px solid #1e1e1c",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "8px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#2e2e2c",
                margin: "0 0 12px",
              }}
            >
              {images.length} image{images.length !== 1 ? "s" : ""}
              {product.video ? " + video" : ""}
            </p>
            {/* Mini thumbnails */}
            <div style={{ display: "flex", gap: "3px" }}>
              {images.slice(0, 6).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setLightboxIdx(idx);
                    setLightboxOpen(true);
                  }}
                  style={{
                    flexShrink: 0,
                    width: "40px",
                    height: "52px",
                    overflow: "hidden",
                    background: "#1e1e1c",
                    border: "1px solid #2e2e2c",
                    padding: 0,
                    cursor: "zoom-in",
                    transition: "border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#5a5754")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#2e2e2c")
                  }
                >
                  <img
                    src={img}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </button>
              ))}
              {images.length > 6 && (
                <div
                  style={{
                    width: "40px",
                    height: "52px",
                    background: "#1e1e1c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "9px",
                      color: "#3a3734",
                    }}
                  >
                    +{images.length - 6}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 3: Related products
          ════════════════════════════════════════════════════════ */}
      {relatedProducts.length > 0 && (
        <div
          style={{
            background: "#f0ede6",
            padding: "80px 64px",
            borderTop: "1px solid #e0ddd8",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "40px",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "#aaa",
                margin: 0,
              }}
            >
              You may also like
            </p>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#bbb",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              ← Back to results
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
            }}
          >
            {relatedProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
