import { useState } from "react";
import { Product } from "../types";
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [hovered, setHovered] = useState(false);
  const hasHoverImage = product.images && product.images.length > 1;

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
          aspectRatio: "3/4",
          backgroundColor: "#f0ede8",
        }}
      >
        {/* Primary image (From Layer 1) */}
        {product.images && product.images.length > 0 && (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "opacity 0.6s ease, transform 0.8s ease",
              opacity: hovered && hasHoverImage ? 0 : 1,
              transform: hovered ? "scale(1.04)" : "scale(1)",
            }}
          />
        )}

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

        {/* --- NEW LAYER 2 UI BELOW --- */}

        {/* Brand badge (Top Left Overlay) */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(4px)",
            padding: "3px 8px",
            transition: "opacity 0.3s ease",
            opacity: hovered ? 1 : 0,
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
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "15px",
            fontWeight: 400,
            color: "#666",
            margin: 0,
          }}
        >
          {/* TODO 7: Output the price and currency here. Use .toLocaleString("tr-TR") on the price to make it look nice! */}
          {product.price.toLocaleString("tr-TR")} {product.currency}
        </p>
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
