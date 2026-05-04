import { useNavigate } from "react-router-dom";
import { Product } from "../types";

// Local helpers for this component
function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function discountPct(original: number, current: number) {
  return Math.round(((original - current) / original) * 100);
}

export default function SaleCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const pct = product.originalPrice
    ? discountPct(product.originalPrice, product.price)
    : 0;

  return (
    <div
      className="sale-card"
      onClick={() => navigate(`/product/${product.id}`)}
      style={{ flexShrink: 0, width: "180px", scrollSnapAlign: "start" }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "3/4",
          overflow: "hidden",
          background: "#1e1e1c",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 2,
            background: "#b94040",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.08em",
            padding: "3px 7px",
            fontWeight: 500,
          }}
        >
          −{pct}%
        </span>
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.88,
              transition: "opacity 0.3s ease, transform 0.5s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "1";
              (e.currentTarget as HTMLImageElement).style.transform =
                "scale(1.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0.88";
              (e.currentTarget as HTMLImageElement).style.transform =
                "scale(1)";
            }}
          />
        )}
      </div>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "12px",
          fontWeight: 300,
          color: "#e0ddd8",
          margin: "0 0 3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {toTitleCase(product.name)}
      </p>
      <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "#b94040",
            fontWeight: 500,
          }}
        >
          {product.price.toLocaleString("tr-TR")}
        </span>
        {product.originalPrice && (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              color: "#555",
              textDecoration: "line-through",
            }}
          >
            {product.originalPrice.toLocaleString("tr-TR")}
          </span>
        )}
      </div>
    </div>
  );
}
