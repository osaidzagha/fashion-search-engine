import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchProductsFromAPI } from "../services/api";
import ProductCard from "../components/ProductCard";
import { Spinner } from "../components/Spinner";
import { Product } from "../types"; // (Adjust path if needed)
export default function Collection() {
  const { type } = useParams(); // 'sale', 'new-in', 'zara', 'massimo-dutti'

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive the beautiful aesthetic Title based on the URL
  const getHeaderInfo = () => {
    switch (type) {
      case "sale":
        return {
          title: "Archive Sale",
          desc: "Discover pieces at exceptional prices.",
        };
      case "new-in":
        return {
          title: "New Arrivals",
          desc: "The latest additions to our curation.",
        };
      case "zara":
        return {
          title: "Zara",
          desc: "Contemporary silhouettes and modern tailoring.",
        };
      case "massimo-dutti":
        return {
          title: "Massimo Dutti",
          desc: "Refined elegance and premium materials.",
        };
      default:
        return {
          title: "The Collection",
          desc: "Explore our curated catalog.",
        };
    }
  };

  const header = getHeaderInfo();

  useEffect(() => {
    setLoading(true);

    // Build our dynamic filters based on the URL parameter!
    const filters: any = { page: 1 };
    if (type === "sale") filters.onSale = true;
    if (type === "new-in") filters.sort = "newest"; // Assuming your backend supports sort=newest
    if (type === "zara") filters.brands = ["Zara"];
    if (type === "massimo-dutti") filters.brands = ["Massimo Dutti"];

    fetchProductsFromAPI(filters)
      .then((data) => setProducts(data.products))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div style={{ background: "#faf9f6", minHeight: "100vh" }}>
      {/* Aesthetic Cinematic Header */}
      <div
        style={{
          padding: "120px 64px 80px",
          borderBottom: "1px solid #e8e4dc",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#888",
            marginBottom: "16px",
          }}
        >
          Curated Catalog
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "56px",
            fontWeight: 300,
            color: "#1a1a1a",
            margin: "0 0 16px",
          }}
        >
          {header.title}
        </h1>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "20px",
            fontStyle: "italic",
            color: "#888",
            margin: 0,
          }}
        >
          {header.desc}
        </p>
      </div>

      {/* Main Content Area (You can import your existing Filter Sidebar here!) */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "64px" }}>
        {/* If you have a FilterBar component, drop it right here! */}

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "100px",
            }}
          >
            <Spinner />
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "24px",
            }}
          >
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
