import { Product } from "../types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
}

export const ProductGrid = ({ products }: ProductGridProps) => {
  if (products.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "320px",
          gap: "12px",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "28px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#1a1a1a",
            margin: 0,
          }}
        >
          Nothing found
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#999",
            letterSpacing: "0.04em",
            margin: 0,
          }}
        >
          Try adjusting your filters or search term
        </p>
      </div>
    );
  }

  // If the code reaches this point, it means the array has items in it!
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "32px 24px",
      }}
      // Notice this class? This is the responsive grid we set up in index.css!
      className="product-grid-responsive"
    >
      {/* TODO 2: Use the Javascript .map() function to iterate over the 'products' array */}
      {products.map((product) => (
        <ProductCard key={product.link} product={product} />
      ))}
    </div>
  );
};
