import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Product } from "../types";
import { fetchWatchlist } from "../services/api";
import ProductCard from "../components/ProductCard";
import { Spinner } from "../components/Spinner";

export default function Watchlist() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(
    (state: any) => state.auth.isAuthenticated,
  );

  const [trackedItems, setTrackedItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Security Check: Bounce unauthenticated users to login
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // 2. Fetch the data
    setIsLoading(true);
    fetchWatchlist()
      .then((data: any) => {
        // Handle varying backend responses (array vs object)
        const items = Array.isArray(data) ? data : data.items || [];
        setTrackedItems(items);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          height: "70vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner />
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f0ede6",
        minHeight: "100vh",
        padding: "120px 48px 80px",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          marginBottom: "64px",
          borderBottom: "1px solid #e0ddd8",
          paddingBottom: "32px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#8a8784",
            margin: "0 0 16px",
          }}
        >
          Your Portfolio
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontSize: "clamp(36px, 4vw, 56px)",
            color: "#0f0f0d",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Tracked Pieces
        </h1>
      </div>

      {/* ── CONTENT ── */}
      {trackedItems.length === 0 ? (
        // EMPTY STATE
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "80px 0",
          }}
        >
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "24px",
              fontStyle: "italic",
              color: "#aaa",
              marginBottom: "24px",
            }}
          >
            You aren't tracking any price drops yet.
          </p>
          <button
            onClick={() => navigate("/search")}
            style={{
              padding: "14px 32px",
              background: "#0f0f0d",
              color: "#f0ede6",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
              transition: "background 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#0f0f0d")}
          >
            Explore Collection
          </button>
        </div>
      ) : (
        // WATCHLIST GRID
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "40px 24px",
          }}
        >
          {trackedItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
