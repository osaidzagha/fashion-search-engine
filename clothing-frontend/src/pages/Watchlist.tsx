import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
// Import your API functions (adjust names based on your actual api.ts file)
import { fetchWatchlist, removeFromWatchlist } from "../services/api";
import { Spinner } from "../components/Spinner";
import { theme } from "../styles/theme";

export default function Watchlist() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(
    (state: any) => state.auth.isAuthenticated,
  );

  const [trackedItems, setTrackedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    loadWatchlist();
  }, [isAuthenticated, navigate]);

  const loadWatchlist = () => {
    setIsLoading(true);
    fetchWatchlist()
      .then((data: any) => {
        const items = Array.isArray(data) ? data : data.items || [];
        setTrackedItems(items);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  // ── WIRING UP THE REMOVE BUTTON ──
  const handleRemove = async (productId: string) => {
    try {
      // Optimistic UI update: instantly remove it from the screen for a snappy feel
      setTrackedItems((prev) => prev.filter((item) => item.id !== productId));

      // Tell the backend to delete it
      await removeFromWatchlist(productId);
    } catch (error) {
      console.error("Failed to remove item", error);
      // If the backend fails, reload the real list to fix the UI
      loadWatchlist();
    }
  };

  // ── ANALYTICS ──
  const totalTracked = trackedItems.length;
  // Calculate how many items have dropped below the price the user tracked them at
  const itemsOnSale = trackedItems.filter(
    (item) => item.price < (item.trackedPrice || item.price),
  ).length;

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: theme.colors.bgPrimary,
        }}
      >
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ background: theme.colors.bgPrimary, minHeight: "100vh" }}>
      {/* ── DASHBOARD HEADER ── */}
      <div
        style={{
          padding: "120px 64px 60px",
          borderBottom: `1px solid ${theme.colors.borderDark}`,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: theme.colors.textSecondary,
                marginBottom: "16px",
              }}
            >
              Your Portfolio
            </p>
            <h1
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: "56px",
                fontWeight: 300,
                color: theme.colors.textPrimary,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Tracked Archive
            </h1>
          </div>

          {totalTracked > 0 && (
            <div style={{ display: "flex", gap: "48px" }}>
              <div>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "10px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: theme.colors.textSecondary,
                    margin: "0 0 8px",
                  }}
                >
                  Total Tracked
                </p>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "24px",
                    color: theme.colors.textPrimary,
                    margin: 0,
                  }}
                >
                  {totalTracked}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "10px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: theme.colors.textSecondary,
                    margin: "0 0 8px",
                  }}
                >
                  Target Hit
                </p>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "24px",
                    color:
                      itemsOnSale > 0 ? "#2b6b44" : theme.colors.textPrimary,
                    margin: 0,
                  }}
                >
                  {itemsOnSale}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── THE LEDGER LIST ── */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 64px 120px",
        }}
      >
        {trackedItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "160px 0" }}>
            <p
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: "32px",
                fontStyle: "italic",
                color: theme.colors.textSecondary,
                marginBottom: "24px",
              }}
            >
              Your archive is empty.
            </p>
            <button
              onClick={() => navigate("/search")}
              style={{
                padding: "16px 32px",
                background: theme.colors.textPrimary,
                color: theme.colors.bgPrimary,
                fontFamily: theme.fonts.sans,
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                transition: "background 0.3s ease",
              }}
            >
              Explore Catalog
            </button>
          </div>
        ) : (
          <div style={{ marginTop: "40px" }}>
            {/* Table Header Row */}
            <div
              style={{
                display: "flex",
                paddingBottom: "16px",
                borderBottom: `1px solid ${theme.colors.borderDark}`,
                marginBottom: "24px",
              }}
            >
              <div style={{ flex: "0 0 120px" }}></div>
              <div
                style={{
                  flex: "2",
                  fontFamily: theme.fonts.sans,
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: theme.colors.textSecondary,
                }}
              >
                Item
              </div>
              <div
                style={{
                  flex: "1",
                  fontFamily: theme.fonts.sans,
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: theme.colors.textSecondary,
                }}
              >
                Current Price
              </div>
              <div
                style={{
                  flex: "1",
                  fontFamily: theme.fonts.sans,
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: theme.colors.textSecondary,
                  textAlign: "right",
                }}
              >
                Actions
              </div>
            </div>

            {trackedItems.map((product) => {
              // The core logic: Compare current price to the price it was when they clicked track
              const baselinePrice = product.trackedPrice || product.price;
              const priceDifference = product.price - baselinePrice;

              const hasDropped = priceDifference < 0;
              const hasIncreased = priceDifference > 0;

              return (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "24px 0",
                    borderBottom: `1px solid ${theme.colors.borderDark}`,
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ flex: "0 0 120px" }}>
                    <Link to={`/product/${product.id}`}>
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        style={{
                          width: "80px",
                          height: "100px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </Link>
                  </div>

                  {/* Info (Brand & Name) */}
                  <div style={{ flex: "2", paddingRight: "40px" }}>
                    <p
                      style={{
                        fontFamily: theme.fonts.sans,
                        fontSize: "10px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: theme.colors.textSecondary,
                        margin: "0 0 8px",
                      }}
                    >
                      {product.brand}
                    </p>
                    <Link
                      to={`/product/${product.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <h3
                        style={{
                          fontFamily: theme.fonts.heading,
                          fontSize: "24px",
                          fontWeight: 400,
                          color: theme.colors.textPrimary,
                          margin: 0,
                        }}
                      >
                        {product.name}
                      </h3>
                    </Link>
                    {/* Shows the user what price they originally locked in */}
                    <p
                      style={{
                        fontFamily: theme.fonts.sans,
                        fontSize: "10px",
                        color: theme.colors.textSecondary,
                        margin: "8px 0 0",
                      }}
                    >
                      Tracked at: {baselinePrice.toLocaleString("tr-TR")}{" "}
                      {product.currency}
                    </p>
                  </div>

                  {/* Pricing Data & Financial Deltas */}
                  <div style={{ flex: "1" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: theme.fonts.sans,
                          fontSize: "18px",
                          // Green if dropped, Red if increased, Black if unchanged
                          color: hasDropped
                            ? "#2b6b44"
                            : hasIncreased
                              ? "#b94040"
                              : theme.colors.textPrimary,
                        }}
                      >
                        {product.price.toLocaleString("tr-TR")}{" "}
                        {product.currency}
                      </span>
                    </div>

                    {/* The Visual Indicators */}
                    {hasDropped && (
                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span style={{ color: "#2b6b44", fontSize: "12px" }}>
                          ▼
                        </span>
                        <span
                          style={{
                            fontFamily: theme.fonts.sans,
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "#2b6b44",
                          }}
                        >
                          Down{" "}
                          {Math.abs(priceDifference).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    )}

                    {hasIncreased && (
                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span style={{ color: "#b94040", fontSize: "12px" }}>
                          ▲
                        </span>
                        <span
                          style={{
                            fontFamily: theme.fonts.sans,
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "#b94040",
                          }}
                        >
                          Up {priceDifference.toLocaleString("tr-TR")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      flex: "1",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "16px",
                    }}
                  >
                    <button
                      onClick={() => handleRemove(product.id)}
                      style={{
                        fontFamily: theme.fonts.sans,
                        fontSize: "10px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: theme.colors.textSecondary,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "8px",
                      }}
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => navigate(`/product/${product.id}`)}
                      style={{
                        fontFamily: theme.fonts.sans,
                        fontSize: "10px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: theme.colors.textPrimary,
                        background: "transparent",
                        border: `1px solid ${theme.colors.borderDark}`,
                        cursor: "pointer",
                        padding: "8px 24px",
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
