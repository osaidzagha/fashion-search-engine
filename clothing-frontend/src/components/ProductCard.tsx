import { useState } from "react";
import { Product } from "../types";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleCompare } from "../store/productSlice";
import { RootState } from "../store/store"; // Adjust path if needed
interface ProductCardProps {
  product: Product;
}

// ✅ Added helper for the badge calculation
function discountPercent(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const dispatch = useDispatch();
  const compareQueue = useSelector(
    (state: RootState) => state.products.compareQueue,
  );

  const isComparing = compareQueue.some((p) => p.id === product.id);
  const isQueueFull = compareQueue.length >= 2 && !isComparing;
  const [hovered, setHovered] = useState(false);
  const hasHoverImage = product.images && product.images.length > 1;
  const isNew = product.timestamp
    ? Date.now() - new Date(product.timestamp).getTime() < 48 * 60 * 60 * 1000
    : false;

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
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#f0ede8",
        }}
      >
        {/* Primary image (From Layer 1) */}
        {product.images && product.images.length > 0 && (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{
              position: "relative",
              inset: 0,
              width: "100%",
              height: "auto ",
              objectFit: "cover",
              transition: "opacity 0.6s ease, transform 0.8s ease",
              opacity: hovered && hasHoverImage ? 0 : 1,
              transform: hovered ? "scale(1.04)" : "scale(1)",
            }}
          />
        )}
        {/* The Compare Button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevents navigating to the product details page
            e.preventDefault();
            if (!isQueueFull) dispatch(toggleCompare(product));
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
          {/* Subtle scale/balance icon */}
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
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "opacity 0.6s ease, transform 0.8s ease",
              opacity: hovered ? 1 : 0,
              transform: hovered ? "scale(1.04)" : "scale(1.08)",
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
              background: "#b94040", // High-visibility red
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

        {/* the NEW badge right here inside the container! */}
        {isNew && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "#1a1a1a",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "8px",
              letterSpacing: "0.16em",
              padding: "3px 7px",
              textTransform: "uppercase",
              pointerEvents: "none",
            }}
          >
            New
          </div>
        )}
        {/* --- NEW LAYER 2 UI BELOW --- */}

        {/* Brand badge (Top Left Overlay - Adjusted slightly so it doesn't overlap the Sale Badge) */}
        <div
          style={{
            position: "absolute",
            top: isOnSale ? 40 : 12, // ✅ Pushes it down if the sale badge is active
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
            {/* TODO 2: Output the product's brand name here */}
            {product.brand}
          </span>
        </div>

        {/* Quick view hint (Bottom Gradient Overlay) */}
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
            // TODO 3: Use a ternary. If hovered is true -> 1, else -> 0
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

          {/* TODO 4: Only render this span IF hasHoverImage is true. (Hint: Use the && operator like we did for the images) */}
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
          {/* TODO 5: Output the product's brand name here again */}
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
          {/* TODO 6: Output the product's name here. 
              (Bonus challenge: Your original code had some JS here to capitalize the first letter of each word! Give it a try, or just output the raw name for now.) */}
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
              color: isOnSale ? "#b94040" : "#666", // Red if on sale!
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
          // TODO 8: Use a ternary. If hovered is true -> "scaleX(1)", else -> "scaleX(0)"
          transform: hovered ? "scaleX(1)" : "scaleX(0)",
        }}
      />
    </Link>
  );
};
export default ProductCard;
