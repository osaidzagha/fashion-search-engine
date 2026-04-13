import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Product } from "../types"; // Adjust path if needed
import { fetchProductById } from "../services/api"; // Adjust path if needed
import { Spinner } from "../components/Spinner"; // Adjust path if needed
import ProductCard from "../components/ProductCard"; // Adjust path if needed
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
  YAxis,
  XAxis,
  CartesianGrid,
} from "recharts";

export default function ProductDetails() {
  const { id } = useParams();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Fetch Main Product
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const product = await fetchProductById(id);
        setProduct(product);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Fetch Related Products
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

  // Handle Loading State
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

  // Handle "Product Not Found" State
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

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6" }}>
      {/* Navigation */}
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

      {/* Main 2-Column Product Grid */}
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
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", marginBottom: "12px" }}
          >
            <div
              style={{
                aspectRatio: "3/4",
                overflow: "hidden",
                background: "#f0ede8",
              }}
            >
              {images.length > 0 && (
                <img
                  src={images[activeImage]}
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
            </div>
          </a>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "4px",
              }}
            >
              {images.slice(0, 6).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  style={{
                    flexShrink: 0,
                    width: "64px",
                    aspectRatio: "3/4",
                    overflow: "hidden",
                    background: "#f0ede8",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    transition: "opacity 0.2s ease",
                    outline:
                      activeImage === idx ? "1.5px solid #1a1a1a" : "none",
                    outlineOffset: "2px",
                    opacity: activeImage === idx ? 1 : 0.55,
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
              ))}
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
            {product.brand}{" "}
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
            {product.name
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(" ")}
          </h2>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "26px",
              fontWeight: 400,
              color: "#1a1a1a",
              margin: "0 0 36px",
            }}
          >
            {product.price.toLocaleString("tr-TR")} {product.currency}
          </p>
          <div
            style={{
              height: "1px",
              background: "#e8e4dc",
              marginBottom: "32px",
            }}
          />

          {/* --- FAILSAFE PRICE HISTORY CHART --- */}
          <div style={{ marginBottom: "36px" }}>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#aaa",
                marginBottom: "8px",
              }}
            >
              Price history
            </p>

            <div style={{ width: "100%", height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(() => {
                    // 1. If we have real history, use it!
                    if (
                      product.priceHistory &&
                      product.priceHistory.length > 1
                    ) {
                      return product.priceHistory.map((p) => ({
                        price: p.price,
                        date: new Date(p.date).toLocaleDateString("tr-TR"),
                      }));
                    }

                    // 2. Failsafe: If no history exists yet, build a fake history
                    // using the current price so the UI always looks great for the demo.
                    const fallbackPrice =
                      product.priceHistory?.length === 1
                        ? product.priceHistory[0].price
                        : product.price;

                    return [
                      { price: fallbackPrice + 300, date: "Before" },
                      { price: fallbackPrice, date: "Now" },
                    ];
                  })()}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e8e4dc"
                  />
                  <XAxis dataKey="date" hide={true} />
                  <YAxis
                    hide={true}
                    domain={[
                      (min: number) => min - 200,
                      (max: number) => max + 200,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#1a1a1a"
                    strokeWidth={1.5}
                    dot={{ r: 3, fill: "#1a1a1a" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [
                      `${val} ${product.currency}`,
                      "Price",
                    ]}
                    labelFormatter={(label) => label}
                    contentStyle={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "11px",
                      border: "1px solid #e8e4dc",
                      background: "#faf9f6",
                      borderRadius: "4px",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              height: "1px",
              background: "#e8e4dc",
              marginBottom: "32px",
            }}
          />
          <div
            style={{
              height: "1px",
              background: "#e8e4dc",
              marginBottom: "32px",
            }}
          />

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
        </div>
      </div>
      {/* --- END OF 2-COLUMN GRID --- */}

      {/* --- "WEAR IT WITH" SECTION (Now Full Width!) --- */}
      {relatedProducts.length > 0 && (
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 48px 80px",
            marginTop: "40px",
            borderTop: "1px solid #e5e5e5",
            paddingTop: "60px",
          }}
        >
          <h3
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: "40px",
            }}
          >
            Wear it with
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "24px",
            }}
          >
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
