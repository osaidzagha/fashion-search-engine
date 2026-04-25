import { useNavigate } from "react-router-dom";
import { Product } from "../types";

export default function ProductMosaic({ products }: { products: Product[] }) {
  const navigate = useNavigate();
  if (products.length < 4) return null;

  const [p0, p1, p2, p3, p4] = products;

  const cell = (p: Product, style: React.CSSProperties, delay: number) => (
    <div
      key={p.id}
      onClick={() => navigate(`/product/${p.id}`)}
      style={{
        ...style,
        overflow: "hidden",
        background: "#e8e4dc",
        cursor: "pointer",
        animation: `imgReveal 0.8s ease ${delay}s both`,
      }}
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
        }}
      />
    </div>
  );

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
