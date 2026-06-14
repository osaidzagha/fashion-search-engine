import { useNavigate } from "react-router-dom";
import { Product } from "../types";

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString("tr-TR")} ${currency}`;
}

function calcDiscount(p: Product): number {
  if (!p.originalPrice || p.originalPrice <= p.price) return 0;
  return Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
}

export default function ProductMosaic({ products }: { products: Product[] }) {
  const navigate = useNavigate();
  if (products.length < 4) return null;

  const [p0, p1, p2, p3, p4] = products;

  const cell = (p: Product, style: React.CSSProperties, delay: number) => {
    const disc = calcDiscount(p);
    return (
      <div
        key={p.id}
        onClick={() => navigate(`/product/${p.id}`)}
        style={{
          ...style,
          position: "relative",
          overflow: "hidden",
          background: "#e8e4dc",
          cursor: "pointer",
          animation: `imgReveal 0.8s ease ${delay}s both`,
        }}
        className="group"
      >
        <img
          className="mosaic-img"
          src={p.images[0]}
          alt={p.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        />

        {/* Gradient scrim */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)",
          }}
        />

        {/* Frosted glass price badge */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
          style={{
            transition:
              "opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="bg-black/30 dark:bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 inline-flex flex-col gap-0.5">
            <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-white/60 truncate">
              {p.brand}
            </p>
            <p className="font-heading font-light text-[13px] leading-snug text-white truncate">
              {p.name}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`font-heading text-[12px] ${disc > 0 ? "text-[#c8a97e]" : "text-white"}`}
              >
                {formatPrice(p.price, p.currency)}
              </span>
              {disc > 0 && (
                <span className="font-sans text-[8px] tracking-widest uppercase text-[#c8a97e]">
                  ↓{disc}%
                </span>
              )}
              {p.originalPrice && disc > 0 && (
                <span className="font-heading text-[11px] text-white/35 line-through">
                  {p.originalPrice.toLocaleString("tr-TR")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1.1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "6px",
        height: "100%",
        width: "100%",
      }}
    >
      {p0 && cell(p0, { gridRow: "1 / 3" }, 0.1)}
      {p1 && cell(p1, {}, 0.2)}
      {p2 && cell(p2, {}, 0.3)}
      {p3 && cell(p3, {}, 0.35)}
      {p4 && cell(p4, {}, 0.4)}
    </div>
  );
}
