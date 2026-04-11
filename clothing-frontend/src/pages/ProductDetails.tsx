import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Product } from "../types";
import { fetchProductById } from "../services/api";
import { Spinner } from "../components/Spinner";

export default function ProductDetails() {
  // TODO 1: Extract the 'id' from the URL parameters using the useParams hook.
  const { id } = useParams();

  // TODO 2: Initialize 4 pieces of state:
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // TODO 3: Data Fetching Effect
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

  // Handle the Loading State
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

  // Handle the "Product Not Found" State
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

  // Fallback for missing images
  const images = product.images ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6" }}>
      {/* Minimal Nav... (Leaving this block untouched for simplicity) */}
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
          {/* Main image */}
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
              {/* TODO 4: Conditionally render the main image ONLY if images.length > 0 */}
              {/* TODO 5: The 'src' should pull the image from the 'images' array using your 'activeImage' state index! */}
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
              {/* TODO 6: Map over the first 6 images (use .slice(0,6).map(...)) */}
              {/* TODO 7: Give the button an onClick that updates the 'activeImage' state to the current mapping index */}
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

                    // Dynamic styling based on if this thumbnail is the active one!
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

          {/* Sizes and the rest of the details below... */}
          {/* (I've kept this exactly as you provided it to save space, but it's fully functional!) */}

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
    </div>
  );
}
