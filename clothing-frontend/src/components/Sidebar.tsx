import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import {
  toggleBrand,
  toggleSize,
  toggleColor,
  setMaxPrice,
} from "../store/productSlice";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Letter sizes in display order
const LETTER_SIZE_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "ONE SIZE",
];

// Whether a size string is a letter size
function isLetterSize(s: string): boolean {
  return LETTER_SIZE_ORDER.includes(s.toUpperCase().trim());
}

// Whether a size string is numeric (e.g. 32, 34, 36, 30/32)
function isNumericSize(s: string): boolean {
  return /^\d+([\/\-]\d+)?$/.test(s.trim());
}

// Sort letter sizes by order array, numeric sizes numerically
function sortLetterSizes(sizes: string[]): string[] {
  return sizes.sort(
    (a, b) =>
      LETTER_SIZE_ORDER.indexOf(a.toUpperCase().trim()) -
      LETTER_SIZE_ORDER.indexOf(b.toUpperCase().trim()),
  );
}

function sortNumericSizes(sizes: string[]): string[] {
  return sizes.sort((a, b) => parseInt(a) - parseInt(b));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "9px",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "#aaa",
        margin: "0 0 12px",
      }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return (
    <div style={{ height: "1px", background: "#e8e4dc", margin: "24px 0" }} />
  );
}

function SizeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "11px",
        padding: "6px 10px",
        border: "1px solid",
        borderColor: active ? "#1a1a1a" : "#d4d0c8",
        background: active ? "#1a1a1a" : "transparent",
        color: active ? "#fff" : "#555",
        cursor: "pointer",
        transition: "all 0.15s ease",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const Sidebar = () => {
  const dispatch = useDispatch();

  const {
    selectBrands,
    selectSizes,
    selectColors,
    maxPrice,
    availableSizes,
    availableColors,
  } = useSelector((state: RootState) => state.products);

  // Split sizes into groups
  const letterSizes = sortLetterSizes(
    availableSizes.filter((s) => isLetterSize(s)),
  );
  const numericSizes = sortNumericSizes(
    availableSizes.filter((s) => isNumericSize(s)),
  );
  const otherSizes = availableSizes.filter(
    (s) => !isLetterSize(s) && !isNumericSize(s),
  );

  const hasSizes = availableSizes.length > 0;
  const hasColors = availableColors.length > 0;

  return (
    <aside
      style={{
        width: "220px",
        flexShrink: 0,
        borderRight: "1px solid #e8e4dc",
        padding: "40px 32px 40px 48px",
        position: "sticky",
        top: "73px", // below the search header
        height: "calc(100vh - 73px)",
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
    >
      {/* ── Brand ── */}
      <SectionLabel>Brand</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {["Zara", "Massimo Dutti"].map((brand) => {
          const active = selectBrands?.includes(brand);
          return (
            <button
              key={brand}
              onClick={() => dispatch(toggleBrand(brand))}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                letterSpacing: "0.04em",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
                textAlign: "left",
                color: active ? "#1a1a1a" : "#888",
                fontWeight: active ? 500 : 400,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "color 0.15s ease",
              }}
            >
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  border: "1px solid",
                  borderColor: active ? "#1a1a1a" : "#d4d0c8",
                  background: active ? "#1a1a1a" : "transparent",
                  display: "inline-block",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              />
              {brand}
            </button>
          );
        })}
      </div>

      <Divider />

      {/* ── Price ── */}
      <SectionLabel>Max Price</SectionLabel>
      <div>
        <input
          type="range"
          min={0}
          max={15000}
          step={100}
          value={maxPrice ?? 15000}
          onChange={(e) => {
            const val = Number(e.target.value);
            dispatch(setMaxPrice(val >= 15000 ? undefined : val));
          }}
          style={{
            width: "100%",
            accentColor: "#1a1a1a",
            cursor: "pointer",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "6px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              color: "#bbb",
            }}
          >
            0
          </span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              color: maxPrice ? "#1a1a1a" : "#bbb",
            }}
          >
            {maxPrice ? `${maxPrice.toLocaleString("tr-TR")} TL` : "Any"}
          </span>
        </div>
      </div>

      {/* ── Sizes ── */}
      {hasSizes && (
        <>
          <Divider />

          {/* Letter sizes (S, M, L…) */}
          {letterSizes.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <SectionLabel>Size</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {letterSizes.map((size) => (
                  <SizeChip
                    key={size}
                    label={size}
                    active={selectSizes?.includes(size) ?? false}
                    onClick={() => dispatch(toggleSize(size))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Numeric sizes (30, 32, 34…) — only show if present */}
          {numericSizes.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              {letterSizes.length === 0 && <SectionLabel>Size</SectionLabel>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {numericSizes.map((size) => (
                  <SizeChip
                    key={size}
                    label={size}
                    active={selectSizes?.includes(size) ?? false}
                    onClick={() => dispatch(toggleSize(size))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other sizes */}
          {otherSizes.length > 0 && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {otherSizes.map((size) => (
                  <SizeChip
                    key={size}
                    label={size}
                    active={selectSizes?.includes(size) ?? false}
                    onClick={() => dispatch(toggleSize(size))}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Colors ── */}
      {hasColors && (
        <>
          <Divider />
          <SectionLabel>Color</SectionLabel>

          {/* Show top 12 colors as text chips — readable and not overwhelming */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {availableColors.slice(0, 12).map((color) => {
              const active = selectColors?.includes(color);
              return (
                <button
                  key={color}
                  onClick={() => dispatch(toggleColor(color))}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    letterSpacing: "0.04em",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0",
                    textAlign: "left",
                    color: active ? "#1a1a1a" : "#888",
                    fontWeight: active ? 500 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "color 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      border: "1px solid",
                      borderColor: active ? "#1a1a1a" : "#d4d0c8",
                      background: active ? "#1a1a1a" : "transparent",
                      display: "inline-block",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  />
                  {color}
                </button>
              );
            })}
          </div>

          {/* "More colors" count if there are extras */}
          {availableColors.length > 12 && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#bbb",
                margin: "10px 0 0",
              }}
            >
              +{availableColors.length - 12} more
            </p>
          )}
        </>
      )}
    </aside>
  );
};
