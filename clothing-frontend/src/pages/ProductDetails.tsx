import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
  YAxis,
  XAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function discountPercent(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

const PriceTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#1a1a1a",
          padding: "8px 12px",
          borderRadius: "2px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "#fff",
            margin: 0,
          }}
        >
          {payload[0].value.toLocaleString("tr-TR")} {currency}
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "9px",
            color: "#888",
            margin: "2px 0 0",
          }}
        >
          {label}
        </p>
      </div>
    );
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  // ✅ Read auth state from Redux
  const isAuthenticated = useSelector(
    (state: any) => state.auth.isAuthenticated,
  );

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Track Price button state
  const [tracked, setTracked] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);

  // Fetch main product
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      setActiveImage(0);
      setSelectedSize(null);
      try {
        const data = await fetchProductById(id);
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ✅ Check if this product is already tracked (only when logged in)
  useEffect(() => {
    const checkTracked = async () => {
      if (!id || !isAuthenticated) return;
      const result = await checkIsTracked(id);
      setTracked(result);
    };
    checkTracked();
  }, [id, isAuthenticated]);

  // Fetch related products
  useEffect(() => {
    if (!id) return;
    const fetchRelated = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/products/${id}/related`,
        );
        const data = await res.json();
        setRelatedProducts(data);
      } catch (error) {
        console.error("Failed to fetch related products:", error);
      }
    };
    fetchRelated();
  }, [id]);

  // ✅ Track Price handler — redirects to login if not authenticated
  const handleTrackPrice = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!product) return;
    setTrackLoading(true);
    try {
      if (tracked) {
        const ok = await removeFromWatchlist(product.id);
        if (ok) setTracked(false);
      } else {
        const ok = await addToWatchlist(product.id);
        if (ok) setTracked(true);
      }
    } finally {
      setTrackLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#faf9f6",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!product) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#faf9f6",
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
        <Link
          to="/"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#888",
            textDecoration: "none",
          }}
        >
          ← Return to collection
        </Link>
      </div>
    );
  }

  const images = product.images ?? [];
  const hasVideo = !!product.video;
  const showingVideo = hasVideo && activeImage === 0;
  const imageIndex = hasVideo ? activeImage - 1 : activeImage;
  const mediaCount = hasVideo ? images.length + 1 : images.length;

  // ✅ NEW — only show chart when prices actually differ
  const chartData =
    product.priceHistory &&
    product.priceHistory.length > 1 &&
    new Set(product.priceHistory.map((p) => p.price)).size > 1
      ? product.priceHistory.map((p) => ({
          price: p.price,
          date: new Date(p.date).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
          }),
        }))
      : null;

  const isOnSale =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;
  const discount = isOnSale
    ? discountPercent(product.originalPrice!, product.price)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6" }}>
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 48px",
          borderBottom: "1px solid #e8e4dc",
        }}
      >
        <Link
          to="/"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#888",
            textDecoration: "none",
          }}
        >
          ← Collection
        </Link>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontSize: "18px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#1a1a1a",
            margin: 0,
          }}
        >
          Vestire
        </h1>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#bbb",
          }}
        >
          {product.brand}
        </span>
      </nav>

      {/* Main 2-Column Grid */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "48px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "64px",
          alignItems: "start",
        }}
      >
        {/* LEFT: Gallery */}
        <div>
          <div
            style={{
              position: "relative",
              aspectRatio: "3/4",
              overflow: "hidden",
              background: "#f0ede8",
              marginBottom: "12px",
            }}
          >
            {isOnSale && (
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "16px",
                  zIndex: 2,
                  background: "#1a1a1a",
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  padding: "4px 10px",
                }}
              >
                −{discount}%
              </div>
            )}
            {showingVideo ? (
              <video
                ref={videoRef}
                src={product.video}
                autoPlay
                muted
                loop
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "block", width: "100%", height: "100%" }}
              >
                {images.length > 0 && (
                  <img
                    src={images[imageIndex] ?? images[0]}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.6s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.03)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  />
                )}
              </a>
            )}
          </div>

          {mediaCount > 1 && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "4px",
              }}
            >
              {hasVideo && (
                <button
                  onClick={() => setActiveImage(0)}
                  style={{
                    flexShrink: 0,
                    width: "64px",
                    aspectRatio: "3/4",
                    overflow: "hidden",
                    background: "#1a1a1a",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    position: "relative",
                    outline: activeImage === 0 ? "1.5px solid #1a1a1a" : "none",
                    outlineOffset: "2px",
                    opacity: activeImage === 0 ? 1 : 0.55,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "18px",
                    }}
                  >
                    ▶
                  </span>
                  {images[0] && (
                    <img
                      src={images[0]}
                      alt="video"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: 0.4,
                      }}
                    />
                  )}
                </button>
              )}
              {images.slice(0, 6).map((img, idx) => {
                const virtualIdx = hasVideo ? idx + 1 : idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(virtualIdx)}
                    style={{
                      flexShrink: 0,
                      width: "64px",
                      aspectRatio: "3/4",
                      overflow: "hidden",
                      background: "#f0ede8",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      outline:
                        activeImage === virtualIdx
                          ? "1.5px solid #1a1a1a"
                          : "none",
                      outlineOffset: "2px",
                      opacity: activeImage === virtualIdx ? 1 : 0.55,
                    }}
                  >
                    <img
                      src={img}
                      alt={`view ${idx + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Details */}
        <div style={{ paddingTop: "8px" }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#aaa",
              margin: "0 0 12px",
            }}
          >
            {product.brand}
            {product.color && (
              <span style={{ marginLeft: "12px", color: "#ccc" }}>
                · {product.color}
              </span>
            )}
          </p>

          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: "38px",
              lineHeight: 1.1,
              color: "#1a1a1a",
              margin: "0 0 20px",
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
              marginBottom: "36px",
            }}
          >
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "26px",
                fontWeight: 400,
                color: isOnSale ? "#b94040" : "#1a1a1a",
                margin: 0,
              }}
            >
              {product.price.toLocaleString("tr-TR")} {product.currency}
            </p>
            {isOnSale && (
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "18px",
                  color: "#bbb",
                  margin: 0,
                  textDecoration: "line-through",
                }}
              >
                {product.originalPrice!.toLocaleString("tr-TR")}{" "}
                {product.currency}
              </p>
            )}
          </div>

          <div
            style={{
              height: "1px",
              background: "#e8e4dc",
              marginBottom: "32px",
            }}
          />

          {/* Price history chart — only with real data */}
          {chartData && (
            <div style={{ marginBottom: "32px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  marginBottom: "12px",
                }}
              >
                Price history
              </p>
              <div style={{ width: "100%", height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e8e4dc"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 9,
                        fill: "#bbb",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      hide
                      domain={[
                        (min: number) => min - 200,
                        (max: number) => max + 200,
                      ]}
                    />
                    <ReferenceLine
                      y={product.price}
                      stroke="#b94040"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#1a1a1a"
                      strokeWidth={1.5}
                      dot={{ r: 2, fill: "#1a1a1a" }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                    <Tooltip
                      content={<PriceTooltip currency={product.currency} />}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div
                style={{
                  height: "1px",
                  background: "#e8e4dc",
                  marginTop: "24px",
                  marginBottom: "32px",
                }}
              />
            </div>
          )}

          {/* ✅ Track Price button — fully wired */}
          <button
            onClick={handleTrackPrice}
            disabled={trackLoading}
            style={{
              width: "100%",
              padding: "13px",
              marginBottom: "12px",
              background: tracked ? "#f0ede8" : "transparent",
              border: "1px solid #d4d0c8",
              cursor: trackLoading ? "wait" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: tracked ? "#1a1a1a" : "#888",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: trackLoading ? 0.6 : 1,
            }}
          >
            <span>{tracked ? "✓" : "♡"}</span>
            {trackLoading
              ? "..."
              : tracked
                ? "Tracking price"
                : isAuthenticated
                  ? "Track price drop"
                  : "Sign in to track price"}
          </button>

          {/* View on brand */}
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              width: "100%",
              padding: "16px",
              background: "#1a1a1a",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textAlign: "center",
              textDecoration: "none",
              marginBottom: "36px",
            }}
          >
            View on {product.brand} →
          </a>

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div style={{ marginBottom: "36px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  margin: "0 0 12px",
                }}
              >
                Available sizes
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {product.sizes.map((size, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setSelectedSize(size === selectedSize ? null : size)
                    }
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "12px",
                      padding: "8px 14px",
                      border: "1px solid",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      borderColor:
                        selectedSize === size ? "#1a1a1a" : "#d4d0c8",
                      background:
                        selectedSize === size ? "#1a1a1a" : "transparent",
                      color: selectedSize === size ? "#fff" : "#1a1a1a",
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
              background: "#e8e4dc",
              marginBottom: "32px",
            }}
          />

          {/* Description */}
          {product.description && (
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  margin: "0 0 8px",
                }}
              >
                About this piece
              </p>
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "17px",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  color: "#555",
                  margin: 0,
                }}
              >
                {product.description}
              </p>
            </div>
          )}

          {/* Composition */}
          {product.composition && (
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  margin: "0 0 8px",
                }}
              >
                Composition
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  lineHeight: 1.8,
                  color: "#888",
                  margin: 0,
                }}
              >
                {product.composition}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 48px 80px",
          }}
        >
          <div
            style={{
              height: "1px",
              background: "#e8e4dc",
              marginBottom: "48px",
            }}
          />
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#aaa",
              marginBottom: "32px",
            }}
          >
            You may also like
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "24px",
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
