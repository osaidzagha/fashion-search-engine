import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { RootState } from "../store/store";
import { toggleCompare } from "../store/productSlice";
import PriceHistoryChart from "../components/PriceHistoryChart";
import { Product } from "../types";

export default function Compare() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const compareQueue = useSelector(
    (state: RootState) => state.products.compareQueue,
  );

  // Carousel States
  const [imgIdx1, setImgIdx1] = useState(0);
  const [imgIdx2, setImgIdx2] = useState(0);

  // Quick View Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(
    null,
  );

  // Fallback if they navigate here without 2 items
  if (compareQueue.length < 2) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          background: "#faf9f6",
        }}
      >
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "32px",
            fontWeight: 300,
            color: "#1a1a1a",
          }}
        >
          Arena Empty
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#888",
            marginBottom: "24px",
          }}
        >
          Please select two items to compare.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "12px 24px",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Return to Collection
        </button>
      </div>
    );
  }

  const [item1, item2] = compareQueue;

  // Helper for the table rows
  const Row = ({
    label,
    val1,
    val2,
    isTextHeavy = false,
  }: {
    label: string;
    val1: React.ReactNode;
    val2: React.ReactNode;
    isTextHeavy?: boolean;
  }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "48px",
        borderBottom: "1px solid #e8e4dc",
        padding: "32px 0",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#aaa",
            margin: "0 0 16px",
          }}
        >
          {label}
        </p>
        <div
          style={{
            fontFamily: isTextHeavy
              ? "'Cormorant Garamond', serif"
              : "'DM Sans', sans-serif",
            fontSize: isTextHeavy ? "18px" : "13px",
            lineHeight: 1.6,
            color: isTextHeavy ? "#444" : "#1a1a1a",
            fontStyle: isTextHeavy ? "italic" : "normal",
          }}
        >
          {val1}
        </div>
      </div>
      <div style={{ paddingLeft: "24px", borderLeft: "1px solid #e8e4dc" }}>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#aaa",
            margin: "0 0 16px",
          }}
        >
          {label}
        </p>
        <div
          style={{
            fontFamily: isTextHeavy
              ? "'Cormorant Garamond', serif"
              : "'DM Sans', sans-serif",
            fontSize: isTextHeavy ? "18px" : "13px",
            lineHeight: 1.6,
            color: isTextHeavy ? "#444" : "#1a1a1a",
            fontStyle: isTextHeavy ? "italic" : "normal",
          }}
        >
          {val2}
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        paddingBottom: "120px",
        position: "relative",
      }}
    >
      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <nav
        style={{
          padding: "32px 64px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e8e4dc",
        }}
      >
        <Link
          to="/"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#888",
            textDecoration: "none",
          }}
        >
          ← Back to browsing
        </Link>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontSize: "24px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: 0,
            color: "#1a1a1a",
          }}
        >
          The Arena
        </h1>
        <div style={{ width: "120px" }} /> {/* Spacer for flex balance */}
      </nav>

      <div
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 48px" }}
      >
        {/* ══ IMAGES & HERO TITLES ════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "48px",
            marginBottom: "64px",
          }}
        >
          {/* ITEM 1 */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => dispatch(toggleCompare(item1))}
              style={{
                position: "absolute",
                top: "-16px",
                right: "-16px",
                background: "#fff",
                border: "1px solid #e8e4dc",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: "pointer",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1a1a1a",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              title="Remove from compare"
            >
              ×
            </button>

            {/* Carousel Container */}
            <div
              style={{
                position: "relative",
                aspectRatio: "3/4",
                background: "#f0ede8",
                marginBottom: "32px",
                overflow: "hidden",
              }}
            >
              <img
                src={item1.images[imgIdx1]}
                alt={item1.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "opacity 0.3s ease",
                }}
              />
              {/* Carousel Controls */}
              {item1.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setImgIdx1((prev) =>
                        prev === 0 ? item1.images.length - 1 : prev - 1,
                      )
                    }
                    style={{
                      position: "absolute",
                      left: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.8)",
                      border: "none",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() =>
                      setImgIdx1((prev) =>
                        prev === item1.images.length - 1 ? 0 : prev + 1,
                      )
                    }
                    style={{
                      position: "absolute",
                      right: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.8)",
                      border: "none",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    →
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 16,
                      left: 0,
                      right: 0,
                      display: "flex",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {item1.images.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background:
                            i === imgIdx1 ? "#1a1a1a" : "rgba(0,0,0,0.2)",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#888",
                margin: "0 0 12px",
              }}
            >
              {item1.brand}
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "36px",
                fontWeight: 300,
                lineHeight: 1.1,
                margin: "0 0 24px",
                color: "#1a1a1a",
              }}
            >
              {item1.name
                .split(" ")
                .map(
                  (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
                )
                .join(" ")}
            </h2>
            <button
              onClick={() => setQuickViewProduct(item1)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#1a1a1a",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #1a1a1a",
                padding: "0 0 4px",
                cursor: "pointer",
              }}
            >
              Quick View Details
            </button>
          </div>

          {/* ITEM 2 */}
          <div
            style={{
              position: "relative",
              paddingLeft: "24px",
              borderLeft: "1px solid #e8e4dc",
            }}
          >
            <button
              onClick={() => dispatch(toggleCompare(item2))}
              style={{
                position: "absolute",
                top: "-16px",
                right: "-16px",
                background: "#fff",
                border: "1px solid #e8e4dc",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: "pointer",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1a1a1a",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              title="Remove from compare"
            >
              ×
            </button>

            {/* Carousel Container */}
            <div
              style={{
                position: "relative",
                aspectRatio: "3/4",
                background: "#f0ede8",
                marginBottom: "32px",
                overflow: "hidden",
              }}
            >
              <img
                src={item2.images[imgIdx2]}
                alt={item2.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "opacity 0.3s ease",
                }}
              />
              {/* Carousel Controls */}
              {item2.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setImgIdx2((prev) =>
                        prev === 0 ? item2.images.length - 1 : prev - 1,
                      )
                    }
                    style={{
                      position: "absolute",
                      left: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.8)",
                      border: "none",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() =>
                      setImgIdx2((prev) =>
                        prev === item2.images.length - 1 ? 0 : prev + 1,
                      )
                    }
                    style={{
                      position: "absolute",
                      right: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.8)",
                      border: "none",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    →
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 16,
                      left: 0,
                      right: 0,
                      display: "flex",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {item2.images.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background:
                            i === imgIdx2 ? "#1a1a1a" : "rgba(0,0,0,0.2)",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#888",
                margin: "0 0 12px",
              }}
            >
              {item2.brand}
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "36px",
                fontWeight: 300,
                lineHeight: 1.1,
                margin: "0 0 24px",
                color: "#1a1a1a",
              }}
            >
              {item2.name
                .split(" ")
                .map(
                  (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
                )
                .join(" ")}
            </h2>
            <button
              onClick={() => setQuickViewProduct(item2)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#1a1a1a",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #1a1a1a",
                padding: "0 0 4px",
                cursor: "pointer",
              }}
            >
              Quick View Details
            </button>
          </div>
        </div>

        {/* ══ DATA TABLE ══════════════════════════════════════════════════════ */}
        <div style={{ borderTop: "2px solid #1a1a1a" }}>
          <Row
            label="Current Price"
            val1={
              <span
                style={{
                  color: item1.originalPrice ? "#b94040" : "#1a1a1a",
                  fontSize: "24px",
                }}
              >
                {item1.price.toLocaleString("tr-TR")} {item1.currency}
                {item1.originalPrice && (
                  <span
                    style={{
                      textDecoration: "line-through",
                      color: "#aaa",
                      fontSize: "15px",
                      marginLeft: "12px",
                    }}
                  >
                    {item1.originalPrice.toLocaleString("tr-TR")}{" "}
                    {item1.currency}
                  </span>
                )}
              </span>
            }
            val2={
              <span
                style={{
                  color: item2.originalPrice ? "#b94040" : "#1a1a1a",
                  fontSize: "24px",
                }}
              >
                {item2.price.toLocaleString("tr-TR")} {item2.currency}
                {item2.originalPrice && (
                  <span
                    style={{
                      textDecoration: "line-through",
                      color: "#aaa",
                      fontSize: "15px",
                      marginLeft: "12px",
                    }}
                  >
                    {item2.originalPrice.toLocaleString("tr-TR")}{" "}
                    {item2.currency}
                  </span>
                )}
              </span>
            }
          />

          <Row
            label="About this piece"
            isTextHeavy={true}
            val1={item1.description || "No description provided."}
            val2={item2.description || "No description provided."}
          />

          <Row
            label="Color"
            val1={item1.color || "Not specified"}
            val2={item2.color || "Not specified"}
          />

          <Row
            label="Composition"
            val1={item1.composition || "Not specified"}
            val2={item2.composition || "Not specified"}
          />

          <Row
            label="Available Sizes"
            val1={
              item1.sizes?.length
                ? item1.sizes.join(", ")
                : "Out of stock / One size"
            }
            val2={
              item2.sizes?.length
                ? item2.sizes.join(", ")
                : "Out of stock / One size"
            }
          />

          {/* Price History Charts Side-by-Side */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "48px",
              paddingTop: "64px",
              borderTop: "1px solid #e8e4dc",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  margin: "0 0 32px",
                }}
              >
                Price History
              </p>
              <PriceHistoryChart
                history={item1.priceHistory}
                currentPrice={item1.price}
                currency={item1.currency}
              />
            </div>
            <div
              style={{ paddingLeft: "24px", borderLeft: "1px solid #e8e4dc" }}
            >
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  margin: "0 0 32px",
                }}
              >
                Price History
              </p>
              <PriceHistoryChart
                history={item2.priceHistory}
                currentPrice={item2.price}
                currency={item2.currency}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══ QUICK VIEW MODAL OVERLAY ═════════════════════════════════════════ */}
      {quickViewProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 15, 13, 0.4)",
            backdropFilter: "blur(6px)",
            padding: "48px",
          }}
          onClick={() => setQuickViewProduct(null)}
        >
          {/* Modal Content Box */}
          <div
            onClick={(e) => e.stopPropagation()} // Prevent clicking inside from closing modal
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "900px",
              height: "80vh",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setQuickViewProduct(null)}
              style={{
                position: "absolute",
                top: 24,
                right: 24,
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#1a1a1a",
                zIndex: 10,
              }}
            >
              ✕
            </button>

            {/* Left side: Scrollable Images */}
            <div style={{ overflowY: "auto", background: "#f5f2ed" }}>
              {quickViewProduct.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  style={{ width: "100%", display: "block" }}
                />
              ))}
            </div>

            {/* Right side: Info */}
            <div style={{ padding: "64px 48px", overflowY: "auto" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#888",
                  margin: "0 0 16px",
                }}
              >
                {quickViewProduct.brand}
              </p>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "32px",
                  fontWeight: 300,
                  margin: "0 0 24px",
                  color: "#1a1a1a",
                }}
              >
                {quickViewProduct.name}
              </h2>
              <div
                style={{
                  fontSize: "20px",
                  margin: "0 0 48px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    color: quickViewProduct.originalPrice
                      ? "#b94040"
                      : "#1a1a1a",
                  }}
                >
                  {quickViewProduct.price.toLocaleString("tr-TR")}{" "}
                  {quickViewProduct.currency}
                </span>
                {quickViewProduct.originalPrice && (
                  <span
                    style={{
                      textDecoration: "line-through",
                      color: "#aaa",
                      fontSize: "14px",
                    }}
                  >
                    {quickViewProduct.originalPrice.toLocaleString("tr-TR")}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: "32px" }}>
                <h4
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "9px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#aaa",
                    margin: "0 0 12px",
                  }}
                >
                  Details
                </h4>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: "#444",
                  }}
                >
                  {quickViewProduct.description}
                </p>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <h4
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "9px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#aaa",
                    margin: "0 0 12px",
                  }}
                >
                  Color
                </h4>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    color: "#1a1a1a",
                  }}
                >
                  {quickViewProduct.color}
                </p>
              </div>

              <div>
                <h4
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "9px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#aaa",
                    margin: "0 0 12px",
                  }}
                >
                  Materials
                </h4>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    color: "#1a1a1a",
                  }}
                >
                  {quickViewProduct.composition}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
