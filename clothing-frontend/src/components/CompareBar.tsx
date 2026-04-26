import { useCompare } from "../context/CompareContext";
import { theme } from "../styles/theme";

// Inject animation styles once
if (
  typeof document !== "undefined" &&
  !document.getElementById("cbar-styles")
) {
  const s = document.createElement("style");
  s.id = "cbar-styles";
  s.textContent = `
    @keyframes cbar-slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);   opacity: 1; }
    }
    @keyframes cbar-itemIn {
      from { transform: scale(0.85); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }
    .cbar-compare-btn:hover { background: ${theme.colors.textPrimary} !important; color: ${theme.colors.bgPrimary} !important; }
    .cbar-clear-btn:hover   { color: ${theme.colors.textPrimary} !important; }
    .cbar-remove-btn:hover  { background: ${theme.colors.bgHover} !important; }
  `;
  document.head.appendChild(s);
}

export function CompareBar() {
  const { compareList, removeFromCompare, openOverlay, clearCompare } =
    useCompare();

  // Don't render if nothing selected
  if (compareList.length === 0) return null;

  const canCompare = compareList.length === 2;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 800,
        background: theme.colors.bgPrimary,
        borderTop: `1px solid ${theme.colors.borderDark}`,
        padding: "14px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "24px",
        animation: "cbar-slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      {/* Left: label */}
      <div style={{ flexShrink: 0 }}>
        <p
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: "8px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: theme.colors.textMuted,
            margin: "0 0 2px",
          }}
        >
          Comparing
        </p>
        <p
          style={{
            fontFamily: theme.fonts.heading,
            fontStyle: "italic",
            fontSize: "14px",
            color: theme.colors.textSecondary,
            margin: 0,
          }}
        >
          {compareList.length} / 2 selected
        </p>
      </div>

      {/* Center: product slots */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Slot 1 */}
        {compareList[0] ? (
          <ProductSlot
            product={compareList[0]}
            onRemove={() => removeFromCompare(compareList[0].id)}
          />
        ) : (
          <EmptySlot label="Add first item" />
        )}

        {/* VS divider */}
        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontStyle: "italic",
            fontSize: "16px",
            color: theme.colors.borderLight,
            flexShrink: 0,
          }}
        >
          vs
        </div>

        {/* Slot 2 */}
        {compareList[1] ? (
          <ProductSlot
            product={compareList[1]}
            onRemove={() => removeFromCompare(compareList[1].id)}
          />
        ) : (
          <EmptySlot label="Add second item" />
        )}
      </div>

      {/* Right: actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <button
          className="cbar-clear-btn"
          onClick={clearCompare}
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: "9px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: theme.colors.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: "color 0.2s ease",
          }}
        >
          Clear
        </button>

        <button
          className="cbar-compare-btn"
          onClick={openOverlay}
          disabled={!canCompare}
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: "10px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: canCompare ? theme.colors.bgPrimary : theme.colors.textMuted,
            background: canCompare
              ? theme.colors.textPrimary
              : theme.colors.borderDark,
            border: "none",
            cursor: canCompare ? "pointer" : "not-allowed",
            padding: "10px 24px",
            transition: "all 0.2s ease",
            fontWeight: 500,
          }}
        >
          Compare →
        </button>
      </div>
    </div>
  );
}

// ── Product slot ──────────────────────────────────────────────────────────────
function ProductSlot({
  product,
  onRemove,
}: {
  product: any;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: theme.colors.bgSecondary,
        border: `1px solid ${theme.colors.borderDark}`,
        padding: "6px 10px 6px 6px",
        animation: "cbar-itemIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        maxWidth: "220px",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: "36px",
          height: "46px",
          flexShrink: 0,
          overflow: "hidden",
          background: theme.colors.bgHover,
        }}
      >
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: "9px",
            letterSpacing: "0.06em",
            color: theme.colors.textPrimary,
            margin: "0 0 2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "120px",
          }}
        >
          {product.name
            .split(" ")
            .map(
              (w: string) =>
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
            )
            .join(" ")}
        </p>
        <p
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "13px",
            color: theme.colors.textMuted,
            margin: 0,
          }}
        >
          {product.price.toLocaleString("tr-TR")} {product.currency}
        </p>
      </div>

      {/* Remove */}
      <button
        className="cbar-remove-btn"
        onClick={onRemove}
        style={{
          flexShrink: 0,
          width: "20px",
          height: "20px",
          background: theme.colors.borderDark,
          border: "none",
          cursor: "pointer",
          color: theme.colors.textMuted,
          fontSize: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s ease",
          borderRadius: "0",
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Empty slot ────────────────────────────────────────────────────────────────
function EmptySlot({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "200px",
        height: "58px",
        border: `1px dashed ${theme.colors.borderLight}`,
        background: "transparent",
      }}
    >
      <p
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: "8px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: theme.colors.borderLight,
          margin: 0,
        }}
      >
        {label}
      </p>
    </div>
  );
}
