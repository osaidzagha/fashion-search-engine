import { useState } from "react";
import { Product } from "../types";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useCompare } from "../context/CompareContext";
import { theme } from "../styles/theme";
import { ProductSkeleton } from "./ProductSkeleton";

interface ProductCardProps {
  product: Product;
}

// ✅ Added helper for the badge calculation
function discountPercent(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [hovered, setHovered] = useState(false);

  // 👇 NEW: Track when the heavy image finishes downloading
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const dispatch = useDispatch();
  // 👇 Rip out Redux, use the new Context!
  const { compareList, addToCompare, removeFromCompare, isInCompare } =
    useCompare();

  const isComparing = isInCompare(product.id);
  const isQueueFull = compareList.length >= 2 && !isComparing;

  const hasHoverImage = product.images && product.images.length > 1;

  // ✅ Added Sale Logic
  const isOnSale =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;
  const discount = isOnSale
    ? discountPercent(product.originalPrice!, product.price)
    : 0;

  return (
    <Link
      to={`/product/${product.id}`}
      className="block"
      style={{ textDecoration: "none" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-skeletonBase">
        {/* Skeleton as BASE layer */}
        {!isImageLoaded && <ProductSkeleton isCardMode={true} />}

        {/* Primary Image */}
        {product.images && product.images.length > 0 && (
          <img
            src={product.images[0]}
            alt={product.name}
            onLoad={() => setIsImageLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${
          isImageLoaded
            ? "opacity-100 scale-100 blur-0"
            : "opacity-0 scale-[1.06] blur-md"
        }
        ${hovered && hasHoverImage ? "lg:opacity-0" : ""}
      `}
          />
        )}
        {/* The Compare Button */}
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
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 10,
            background: isComparing ? "#1a1a1a" : "rgba(255,255,255,0.9)",
            color: isComparing ? "#fff" : "#1a1a1a",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isQueueFull ? "not-allowed" : "pointer",
            opacity: isQueueFull ? 0.4 : 1,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease",
          }}
          title={isComparing ? "Remove from Compare" : "Add to Compare"}
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

        {/* Hover image (From Layer 1) */}
        {hasHoverImage && (
          <img
            src={product.images[1]}
            alt={`${product.name} alternate view`}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: hovered && isImageLoaded ? 1 : 0,
              transform: hovered ? "scale(1.03)" : "scale(1.08)",
            }}
          />
        )}

        {/* ✅ THE NEW SALE BADGE (Top Left) */}
        {isOnSale && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 10,
              background: "#b94040",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.12em",
              padding: "4px 8px",
              borderRadius: "2px",
            }}
          >
            −{discount}%
          </div>
        )}

        {/* Brand badge */}
        <div
          style={{
            position: "absolute",
            top: isOnSale ? 40 : 12,
            left: 12,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(4px)",
            padding: "3px 8px",
            transition: "opacity 0.3s ease, top 0.3s ease",
            opacity: hovered ? 1 : 0,
            zIndex: 5,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#1a1a1a",
            }}
          >
            {product.brand}
          </span>
        </div>

        {/* Quick view hint */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px 14px 14px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.18), transparent)",
            transition: "opacity 0.4s ease",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            opacity: hovered ? 1 : 0,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            View details →
          </span>

          {hasHoverImage && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {product.images.length} photos
            </span>
          )}
        </div>
      </div>

      {/* Info below card */}
      <div style={{ paddingTop: "12px", paddingBottom: "4px" }}>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#999",
            margin: 0,
            marginBottom: "4px",
          }}
        >
          {product.brand}
        </p>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "17px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#1a1a1a",
            margin: 0,
            marginBottom: "6px",
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {product.name
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")}
        </p>

        {/* ✅ UPDATED PRICE DISPLAY */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "15px",
              fontWeight: 400,
              color: isOnSale ? "#b94040" : "#666",
              margin: 0,
            }}
          >
            {product.price.toLocaleString("tr-TR")} {product.currency}
          </p>
          {isOnSale && (
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "13px",
                color: "#bbb",
                textDecoration: "line-through",
                margin: 0,
              }}
            >
              {product.originalPrice!.toLocaleString("tr-TR")}
            </p>
          )}
        </div>
      </div>

      {/* Hover underline accent */}
      <div
        style={{
          height: "1px",
          background: "#1a1a1a",
          transformOrigin: "left",
          transition: "transform 0.4s ease",
          marginTop: "8px",
          transform: hovered ? "scaleX(1)" : "scaleX(0)",
        }}
      />
    </Link>
  );
};
export default ProductCard;
