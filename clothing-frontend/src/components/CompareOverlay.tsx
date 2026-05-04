import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import { Product } from "../types";
import PriceHistoryChart from "./PriceHistoryChart";
import { theme } from "../styles/theme"; // 👈 Your new Design System!

// ─── CSS ──────────────────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("cov-styles")) {
  const s = document.createElement("style");
  s.id = "cov-styles";
  s.textContent = `
    @keyframes cov-in {
      from { opacity: 0; transform: translateY(32px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes cov-imgIn {
      from { opacity: 0; transform: scale(1.06); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes cov-lineGrow {
      from { height: 0; opacity: 0; }
      to   { height: 100%; opacity: 1; }
    }
    @keyframes cov-rowIn {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .cov-close:hover { background: ${theme.colors.bgHover} !important; }
    .cov-view-btn:hover { opacity: 0.7 !important; }
    .cov-scroll::-webkit-scrollbar { display: none; }
    .cov-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    .cov-winner-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(240,237,230,0.08);
      border: 1px solid ${theme.colors.borderLight};
      padding: 2px 8px;
      border-radius: 0;
    }
    .cov-win { color: ${theme.colors.accentGreen} !important; }
    .cov-lose { color: ${theme.colors.textMuted} !important; }
  `;
  document.head.appendChild(s);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function discountPct(original: number, current: number) {
  return Math.round(((original - current) / original) * 100);
}

// ─── Stat row with winner highlight ──────────────────────────────────────────
function StatRow({
  label,
  valueA,
  valueB,
  winner,
  delay,
}: {
  label: string;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  winner: "A" | "B" | "tie" | null;
  delay: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: "0",
        padding: "18px 0",
        borderBottom: `1px solid ${theme.colors.bgSecondary}`,
        animation: `cov-rowIn 0.5s ease ${delay}s both`,
      }}
    >
      {/* Left value */}
      <div
        style={{
          paddingRight: "32px",
          textAlign: "right",
        }}
      >
        <span
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "16px",
            color:
              winner === "A"
                ? theme.colors.textPrimary
                : theme.colors.textMuted,
            fontWeight: winner === "A" ? 400 : 300,
            transition: "color 0.3s ease",
          }}
        >
          {valueA}
        </span>
        {winner === "A" && (
          <span
            style={{
              display: "block",
              fontFamily: theme.fonts.sans,
              fontSize: "7px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: theme.colors.accentGreen,
              marginTop: "3px",
            }}
          >
            ✓ Better
          </span>
        )}
      </div>

      {/* Center label */}
      <div
        style={{
          padding: "0 20px",
          textAlign: "center",
          borderLeft: `1px solid ${theme.colors.bgSecondary}`,
          borderRight: `1px solid ${theme.colors.bgSecondary}`,
          minWidth: "96px",
        }}
      >
        <span
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: "8px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: theme.colors.textMuted,
          }}
        >
          {label}
        </span>
        {winner === "tie" && (
          <p
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: "7px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: theme.colors.textTertiary,
              margin: "3px 0 0",
            }}
          >
            Tie
          </p>
        )}
      </div>

      {/* Right value */}
      <div style={{ paddingLeft: "32px" }}>
        <span
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "16px",
            color:
              winner === "B"
                ? theme.colors.textPrimary
                : theme.colors.textMuted,
            fontWeight: winner === "B" ? 400 : 300,
            transition: "color 0.3s ease",
          }}
        >
          {valueB}
        </span>
        {winner === "B" && (
          <span
            style={{
              display: "block",
              fontFamily: theme.fonts.sans,
              fontSize: "7px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: theme.colors.accentGreen,
              marginTop: "3px",
            }}
          >
            ✓ Better
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export function CompareOverlay() {
  const { compareList, overlayOpen, closeOverlay, removeFromCompare } =
    useCompare();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    if (overlayOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [overlayOpen, closeOverlay]);

  if (!overlayOpen || compareList.length < 2) return null;

  const [A, B] = compareList as [Product, Product];

  // ── Computed stats ──
  const priceWinner: "A" | "B" | "tie" =
    A.price < B.price ? "A" : B.price < A.price ? "B" : "tie";

  const discA = A.originalPrice ? discountPct(A.originalPrice, A.price) : 0;
  const discB = B.originalPrice ? discountPct(B.originalPrice, B.price) : 0;
  const discountWinner: "A" | "B" | "tie" | null =
    discA === 0 && discB === 0
      ? null
      : discA > discB
        ? "A"
        : discB > discA
          ? "B"
          : "tie";

  const sizesA = A.sizes?.length ?? 0;
  const sizesB = B.sizes?.length ?? 0;
  const sizesWinner: "A" | "B" | "tie" =
    sizesA > sizesB ? "A" : sizesB > sizesA ? "B" : "tie";

  const brandWinner: "A" | "B" | "tie" | null =
    A.brand !== B.brand ? null : "tie";

  // ── Overall winner (who wins more categories) ──
  let scoreA = 0;
  let scoreB = 0;
  if (priceWinner === "A") scoreA++;
  if (priceWinner === "B") scoreB++;
  if (discountWinner === "A") scoreA++;
  if (discountWinner === "B") scoreB++;
  if (sizesWinner === "A") scoreA++;
  if (sizesWinner === "B") scoreB++;
  const overallWinner: "A" | "B" | null =
    scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: theme.colors.bgPrimary,
        display: "flex",
        flexDirection: "column",
        animation: "cov-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 48px",
          borderBottom: `1px solid ${theme.colors.bgSecondary}`,
          flexShrink: 0,
        }}
      >
        <div>
          <p
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: "8px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: theme.colors.textMuted,
              margin: "0 0 2px",
            }}
          >
            Side by Side
          </p>
          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontWeight: 300,
              fontSize: "20px",
              color: theme.colors.textPrimary,
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            Product Comparison
          </h2>
        </div>

        {/* Overall verdict */}
        {overallWinner && (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: "8px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: theme.colors.textMuted,
                margin: "0 0 4px",
              }}
            >
              Better value
            </p>
            <p
              style={{
                fontFamily: theme.fonts.heading,
                fontStyle: "italic",
                fontSize: "16px",
                color: theme.colors.accentGreen,
                margin: 0,
              }}
            >
              {toTitleCase(overallWinner === "A" ? A.name : B.name)
                .split(" ")
                .slice(0, 4)
                .join(" ")}
            </p>
          </div>
        )}

        <button
          className="cov-close"
          onClick={closeOverlay}
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: theme.colors.textSecondary,
            background: theme.colors.bgSecondary,
            border: "none",
            cursor: "pointer",
            padding: "10px 20px",
            transition: "background 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>✕</span> Close
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        className="cov-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {/* ══ PRODUCT A ══ */}
        <div
          style={{
            borderRight: `1px solid ${theme.colors.bgSecondary}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Hero image */}
          <div
            style={{
              position: "relative",
              aspectRatio: "3 / 4",
              overflow: "hidden",
              background: theme.colors.bgSecondary,
              cursor: "pointer",
            }}
            onClick={() => {
              closeOverlay();
              navigate(`/product/${A.id}`);
            }}
          >
            {A.images?.[0] && (
              <img
                src={A.images[0]}
                alt={A.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  animation: "cov-imgIn 0.8s ease 0.2s both",
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
            {/* Overlay tag */}
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                background:
                  overallWinner === "A"
                    ? theme.colors.accentGreen
                    : "transparent",
                border:
                  overallWinner === "A"
                    ? "none"
                    : `1px solid ${theme.colors.borderDark}`,
                color:
                  overallWinner === "A" ? "#0f2010" : theme.colors.textMuted,
                fontFamily: theme.fonts.sans,
                fontSize: "8px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "4px 10px",
                fontWeight: overallWinner === "A" ? 600 : 400,
              }}
            >
              {overallWinner === "A" ? "✓ Better value" : A.brand}
            </div>
            {/* Sale badge */}
            {discA > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: theme.colors.accentRed,
                  color: "#fff",
                  fontFamily: theme.fonts.sans,
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                  padding: "4px 8px",
                }}
              >
                −{discA}%
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: "16px",
                right: "16px",
                fontFamily: theme.fonts.sans,
                fontSize: "8px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Tap to view →
            </div>
          </div>

          {/* Info */}
          <div style={{ padding: "28px 40px", flex: 1 }}>
            <p
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: "8px",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: theme.colors.textMuted,
                margin: "0 0 8px",
              }}
            >
              {A.brand} {A.color && `· ${A.color}`}
            </p>
            <h3
              style={{
                fontFamily: theme.fonts.heading,
                fontWeight: 300,
                fontSize: "22px",
                color: theme.colors.textPrimary,
                margin: "0 0 16px",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              {toTitleCase(A.name)}
            </h3>

            {/* Price */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
                marginBottom: "24px",
              }}
            >
              <span
                style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: "24px",
                  color:
                    priceWinner === "A"
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary,
                }}
              >
                {A.price.toLocaleString("tr-TR")} {A.currency}
              </span>
              {A.originalPrice && (
                <span
                  style={{
                    fontFamily: theme.fonts.heading,
                    fontSize: "15px",
                    color: theme.colors.borderDark,
                    textDecoration: "line-through",
                  }}
                >
                  {A.originalPrice.toLocaleString("tr-TR")}
                </span>
              )}
            </div>

            {/* Price chart */}
            <div style={{ marginBottom: "24px", opacity: 0.8 }}>
              <PriceHistoryChart
                history={A.priceHistory}
                currentPrice={A.price}
                originalPrice={A.originalPrice}
                currency={A.currency}
                theme="dark"
              />
            </div>

            {/* Sizes */}
            {A.sizes && A.sizes.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "8px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: theme.colors.textMuted,
                    margin: "0 0 8px",
                  }}
                >
                  Available sizes
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {A.sizes.map((sz, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: theme.fonts.sans,
                        fontSize: "10px",
                        padding: "4px 9px",
                        border: `1px solid ${theme.colors.borderLight}`,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {A.description && (
              <p
                style={{
                  fontFamily: theme.fonts.heading,
                  fontStyle: "italic",
                  fontSize: "14px",
                  lineHeight: 1.7,
                  color: theme.colors.textTertiary,
                  margin: 0,
                }}
              >
                {A.description.slice(0, 180)}
                {A.description.length > 180 ? "…" : ""}
              </p>
            )}

            {/* Composition */}
            {A.composition && (
              <div style={{ marginTop: "16px" }}>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "8px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: theme.colors.textMuted,
                    margin: "0 0 6px",
                  }}
                >
                  Composition
                </p>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "11px",
                    color: theme.colors.textTertiary,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {A.composition}
                </p>
              </div>
            )}

            {/* CTA */}
            <a
              href={A.link}
              target="_blank"
              rel="noopener noreferrer"
              className="cov-view-btn"
              style={{
                display: "block",
                marginTop: "28px",
                padding: "12px",
                background: theme.colors.textPrimary,
                color: "#0f0f0d",
                fontFamily: theme.fonts.sans,
                fontSize: "9px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 500,
                transition: "opacity 0.2s ease",
              }}
            >
              View on {A.brand} →
            </a>
          </div>
        </div>

        {/* ══ PRODUCT B ══ */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Hero image */}
          <div
            style={{
              position: "relative",
              aspectRatio: "3 / 4",
              overflow: "hidden",
              background: theme.colors.bgSecondary,
              cursor: "pointer",
            }}
            onClick={() => {
              closeOverlay();
              navigate(`/product/${B.id}`);
            }}
          >
            {B.images?.[0] && (
              <img
                src={B.images[0]}
                alt={B.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  animation: "cov-imgIn 0.8s ease 0.35s both",
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
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                background:
                  overallWinner === "B"
                    ? theme.colors.accentGreen
                    : "transparent",
                border:
                  overallWinner === "B"
                    ? "none"
                    : `1px solid ${theme.colors.borderDark}`,
                color:
                  overallWinner === "B" ? "#0f2010" : theme.colors.textMuted,
                fontFamily: theme.fonts.sans,
                fontSize: "8px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "4px 10px",
                fontWeight: overallWinner === "B" ? 600 : 400,
              }}
            >
              {overallWinner === "B" ? "✓ Better value" : B.brand}
            </div>
            {discB > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: theme.colors.accentRed,
                  color: "#fff",
                  fontFamily: theme.fonts.sans,
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                  padding: "4px 8px",
                }}
              >
                −{discB}%
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: "16px",
                right: "16px",
                fontFamily: theme.fonts.sans,
                fontSize: "8px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Tap to view →
            </div>
          </div>

          {/* Info */}
          <div style={{ padding: "28px 40px", flex: 1 }}>
            <p
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: "8px",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: theme.colors.textMuted,
                margin: "0 0 8px",
              }}
            >
              {B.brand} {B.color && `· ${B.color}`}
            </p>
            <h3
              style={{
                fontFamily: theme.fonts.heading,
                fontWeight: 300,
                fontSize: "22px",
                color: theme.colors.textPrimary,
                margin: "0 0 16px",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              {toTitleCase(B.name)}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
                marginBottom: "24px",
              }}
            >
              <span
                style={{
                  fontFamily: theme.fonts.heading,
                  fontSize: "24px",
                  color:
                    priceWinner === "B"
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary,
                }}
              >
                {B.price.toLocaleString("tr-TR")} {B.currency}
              </span>
              {B.originalPrice && (
                <span
                  style={{
                    fontFamily: theme.fonts.heading,
                    fontSize: "15px",
                    color: theme.colors.borderDark,
                    textDecoration: "line-through",
                  }}
                >
                  {B.originalPrice.toLocaleString("tr-TR")}
                </span>
              )}
            </div>

            {/* Price chart */}
            <div style={{ marginBottom: "24px", opacity: 0.8 }}>
              <PriceHistoryChart
                history={B.priceHistory}
                currentPrice={B.price}
                originalPrice={B.originalPrice}
                currency={B.currency}
                theme="dark"
              />
            </div>

            {B.sizes && B.sizes.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "8px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: theme.colors.textMuted,
                    margin: "0 0 8px",
                  }}
                >
                  Available sizes
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {B.sizes.map((sz, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: theme.fonts.sans,
                        fontSize: "10px",
                        padding: "4px 9px",
                        border: `1px solid ${theme.colors.borderLight}`,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      {sz}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {B.description && (
              <p
                style={{
                  fontFamily: theme.fonts.heading,
                  fontStyle: "italic",
                  fontSize: "14px",
                  lineHeight: 1.7,
                  color: theme.colors.textTertiary,
                  margin: 0,
                }}
              >
                {B.description.slice(0, 180)}
                {B.description.length > 180 ? "…" : ""}
              </p>
            )}

            {B.composition && (
              <div style={{ marginTop: "16px" }}>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "8px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: theme.colors.textMuted,
                    margin: "0 0 6px",
                  }}
                >
                  Composition
                </p>
                <p
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "11px",
                    color: theme.colors.textTertiary,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {B.composition}
                </p>
              </div>
            )}

            <a
              href={B.link}
              target="_blank"
              rel="noopener noreferrer"
              className="cov-view-btn"
              style={{
                display: "block",
                marginTop: "28px",
                padding: "12px",
                background: theme.colors.textPrimary,
                color: "#0f0f0d",
                fontFamily: theme.fonts.sans,
                fontSize: "9px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 500,
                transition: "opacity 0.2s ease",
              }}
            >
              View on {B.brand} →
            </a>
          </div>
        </div>
      </div>

      {/* ── Bottom stat bar ── */}
      <div
        style={{
          borderTop: `1px solid ${theme.colors.bgSecondary}`,
          background: theme.colors.bgPrimary,
          padding: "0 0 4px",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            padding: "12px 40px 0",
            borderBottom: `1px solid ${theme.colors.bgSecondary}`,
          }}
        >
          <p
            style={{
              fontFamily: theme.fonts.heading,
              fontStyle: "italic",
              fontSize: "13px",
              color: theme.colors.textMuted,
              margin: 0,
              textAlign: "right",
              paddingRight: "20px",
            }}
          >
            {toTitleCase(A.name).split(" ").slice(0, 3).join(" ")}
          </p>
          <p
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: "8px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: theme.colors.borderDark,
              margin: 0,
              padding: "0 20px",
              textAlign: "center",
              minWidth: "96px",
            }}
          >
            Stats
          </p>
          <p
            style={{
              fontFamily: theme.fonts.heading,
              fontStyle: "italic",
              fontSize: "13px",
              color: theme.colors.textMuted,
              margin: 0,
              paddingLeft: "20px",
            }}
          >
            {toTitleCase(B.name).split(" ").slice(0, 3).join(" ")}
          </p>
        </div>

        <div style={{ padding: "0 40px" }}>
          <StatRow
            label="Price"
            valueA={`${A.price.toLocaleString("tr-TR")} ${A.currency}`}
            valueB={`${B.price.toLocaleString("tr-TR")} ${B.currency}`}
            winner={priceWinner}
            delay={0.7}
          />
          {discountWinner !== null && (
            <StatRow
              label="Discount"
              valueA={discA > 0 ? `−${discA}%` : "—"}
              valueB={discB > 0 ? `−${discB}%` : "—"}
              winner={discountWinner}
              delay={0.75}
            />
          )}
          <StatRow
            label="Sizes"
            valueA={`${sizesA} options`}
            valueB={`${sizesB} options`}
            winner={sizesWinner}
            delay={0.8}
          />
          <StatRow
            label="Brand"
            valueA={A.brand}
            valueB={B.brand}
            winner={brandWinner}
            delay={0.85}
          />
        </div>
      </div>
    </div>
  );
}
