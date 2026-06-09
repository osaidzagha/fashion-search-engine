import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { clearFilters } from "../store/productSlice";
import {
  toggleBrand,
  toggleSize,
  toggleColor,
  setMaxPrice,
} from "../store/productSlice";
import { X } from "lucide-react";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LETTER_SIZE_ORDER = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "ONE SIZE",
];
function isLetterSize(s: string) {
  return LETTER_SIZE_ORDER.includes(s.toUpperCase().trim());
}
function isNumericSize(s: string) {
  return /^\d+([\/\-]\d+)?$/.test(s.trim());
}
function sortLetterSizes(sizes: string[]) {
  return sizes.sort(
    (a, b) =>
      LETTER_SIZE_ORDER.indexOf(a.toUpperCase().trim()) -
      LETTER_SIZE_ORDER.indexOf(b.toUpperCase().trim()),
  );
}
function sortNumericSizes(sizes: string[]) {
  return sizes.sort((a, b) => parseInt(a) - parseInt(b));
}

// ✅ FIX: junk color values to exclude from the filter list
const JUNK_COLORS = new Set([
  "default",
  "Default",
  "DEFAULT",
  "",
  "null",
  "undefined",
  "None",
  "none",
  "striped", // pattern, not colour
  "Striped",
  "multicoloured",
  "Multicoloured",
  "Multicolored",
]);

function isJunkColor(c: string): boolean {
  if (JUNK_COLORS.has(c)) return true;
  if (/^\d+$/.test(c.trim())) return true; // pure numeric: "02", "50"
  if (c.trim().length <= 2) return true; // single letter codes: "S", "M"
  return false;
}

// ─── Comprehensive color → hex map ────────────────────────────────────────────
const COLOR_HEX: Record<string, string> = {
  // ── Neutrals ──
  black: "#1a1a1a",
  white: "#f8f8f8",
  "off white": "#f5f0e8",
  "off-white": "#f5f0e8",
  "oyster-white": "#f0ece4",
  "oyster white": "#f0ece4",
  cream: "#fffdd0",
  ivory: "#fffff0",
  ecru: "#f0e8d0",
  vanilla: "#f3e5ab",
  "light yellow": "#fef9c3",
  // ── Greys ──
  grey: "#888888",
  gray: "#888888",
  "anthracite grey": "#383e42",
  "anthracite gray": "#383e42",
  anthracite: "#383e42",
  charcoal: "#36454f",
  "light grey": "#c8c8c8",
  "light gray": "#c8c8c8",
  "dark grey": "#555555",
  "dark gray": "#555555",
  silver: "#c0c0c0",
  "grey marl": "#9e9e9e",
  "beige marl": "#c8b99a",
  "brown marl": "#8b7355",
  // ── Beiges & Browns ──
  beige: "#d4b896",
  sand: "#c2b280",
  "light beige": "#e8d8c0",
  camel: "#c19a6b",
  taupe: "#b59e8a",
  khaki: "#c3b091",
  "dark khaki": "#8b7540",
  stone: "#b2a090",
  brown: "#8b5e3c",
  chocolate: "#5c3317",
  "dark brown": "#4a2c17",
  tan: "#d2b48c",
  russet: "#80461b",
  mink: "#a0836b",
  // ── Blues ──
  blue: "#4a90d9",
  "navy blue": "#0a1a5c",
  navy: "#0a1a5c",
  "dark navy": "#050d2e",
  "dark blue": "#0a2580",
  "medium blue": "#3a70b0",
  "light blue": "#a0c4e8",
  "deep blue": "#0a1f70",
  indigo: "#4b0082",
  "mid-blue": "#3a78b5",
  "mid blue": "#3a78b5",
  denim: "#1560bd",
  "sky blue": "#87ceeb",
  teal: "#008080",
  // ── Greens ──
  green: "#3a8f5a",
  olive: "#707030",
  mint: "#98ff98",
  sage: "#b2c2a0",
  forest: "#228b22",
  "dark green": "#1a5c2a",
  emerald: "#50c878",
  // ── Reds & Pinks ──
  red: "#d32f2f",
  burgundy: "#800020",
  maroon: "#800000",
  wine: "#722f37",
  aubergine: "#614051",
  rust: "#b7410e",
  coral: "#ff6b6b",
  pink: "#e8a0b0",
  "light pink": "#f4c2cc",
  rose: "#e8a0a0",
  fuchsia: "#ff00ff",
  // ── Purples ──
  purple: "#7b2d8b",
  lilac: "#c8a2c8",
  lavender: "#e6e6fa",
  plum: "#673147",
  violet: "#8f00ff",
  // ── Warm tones ──
  orange: "#e07028",
  mustard: "#e3a820",
  yellow: "#ffd700",
  gold: "#d4a017",
  // ── Others ──
  multicolour: "linear-gradient(135deg,#f00,#ff0,#0f0,#00f,#f0f)",
  rainbow: "linear-gradient(135deg,#f00,#ff0,#0f0,#00f,#f0f)",
};

function getColorHex(colorName: string): string | undefined {
  if (!colorName) return undefined;
  const key = colorName.toLowerCase().trim();
  // Direct match
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  // Partial match — check if any known key is contained in the color name
  for (const [k, v] of Object.entries(COLOR_HEX)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return undefined;
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex gap-4 mb-4 md:mb-6 transition-colors duration-500">
      <span className="font-sans text-[10px] tracking-widest text-textMuted dark:text-textMuted-dark uppercase">
        |{index}|
      </span>
      <h3 className="font-sans text-[10px] tracking-widest text-textPrimary dark:text-textPrimary-dark uppercase">
        {title}
      </h3>
    </div>
  );
}

function FilterOption({
  active,
  label,
  onClick,
  colorSwatch,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  colorSwatch?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 w-full text-left group py-2 md:py-1 bg-transparent border-none cursor-pointer"
    >
      {colorSwatch ? (
        <div
          className={`w-4 h-4 md:w-3 md:h-3 flex-shrink-0 transition-all ${
            active
              ? "ring-1 ring-offset-1 ring-textPrimary dark:ring-textPrimary-dark"
              : "border border-borderLight dark:border-borderLight-dark"
          }`}
          style={{ backgroundColor: colorSwatch }}
        />
      ) : (
        <span
          className={`font-sans text-[10px] tracking-widest transition-all duration-300 ${
            active
              ? "text-textPrimary dark:text-textPrimary-dark"
              : "text-transparent group-hover:text-borderLight dark:group-hover:text-borderLight-dark"
          }`}
        >
          ■
        </span>
      )}
      <span
        className={`font-sans text-[11px] md:text-[10px] tracking-widest uppercase transition-all duration-300 ${
          active
            ? "text-textPrimary dark:text-textPrimary-dark font-medium"
            : "text-textSecondary dark:text-textSecondary-dark group-hover:text-textPrimary dark:group-hover:text-textPrimary-dark"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export const FilterDrawer = ({ isOpen, onClose }: FilterDrawerProps) => {
  const dispatch = useDispatch();
  const {
    selectBrands,
    selectSizes,
    selectColors,
    maxPrice,
    availableSizes,
    availableColors,
  } = useSelector((state: RootState) => state.products);

  // ✅ FIX: "View More" state
  const [showAllColors, setShowAllColors] = useState(false);

  const letterSizes = sortLetterSizes(availableSizes.filter(isLetterSize));
  const numericSizes = sortNumericSizes(availableSizes.filter(isNumericSize));
  const otherSizes = availableSizes.filter(
    (s) => !isLetterSize(s) && !isNumericSize(s),
  );

  // ✅ FIX: strip junk color values before rendering
  const cleanColors = availableColors.filter((c) => !isJunkColor(c));
  const INITIAL_COLOR_COUNT = 16;
  const visibleColors = showAllColors
    ? cleanColors
    : cleanColors.slice(0, INITIAL_COLOR_COUNT);

  const BRANDS = ["Zara", "Mango", "Massimo Dutti"];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[150] transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-bgPrimary dark:bg-bgPrimary-dark z-[200] transform transition-transform duration-500 ease-elegant flex flex-col shadow-premium dark:shadow-premium-dark ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 md:p-8 border-b border-borderLight dark:border-borderLight-dark transition-colors duration-500">
          <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-textPrimary dark:text-textPrimary-dark">
            Filters
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-textPrimary dark:text-textPrimary-dark hover:opacity-50 transition-opacity bg-transparent border-none cursor-pointer"
          >
            <X size={18} strokeWidth={1} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 md:space-y-16 scrollbar-hide">
          {/* 01 — Curator / Brand */}
          <div>
            <SectionHeader index="01" title="Curator" />
            <div className="flex flex-col gap-2 pl-6 md:pl-10">
              {BRANDS.map((brand) => (
                <FilterOption
                  key={brand}
                  label={brand}
                  active={selectBrands?.includes(brand) ?? false}
                  onClick={() => dispatch(toggleBrand(brand))}
                />
              ))}
            </div>
          </div>

          {/* 02 — Colour */}
          {cleanColors.length > 0 && (
            <div className="animate-fade-in">
              <SectionHeader index="02" title="Colour" />
              <div className="pl-6 md:pl-10">
                {/* 2-column swatch grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {visibleColors.map((color) => {
                    const hex = getColorHex(color);
                    const isActive = selectColors?.includes(color) ?? false;
                    const isGradient = hex?.startsWith("linear");
                    return (
                      <button
                        key={color}
                        onClick={() => dispatch(toggleColor(color))}
                        className="flex items-center gap-3 py-2 text-left group bg-transparent border-none cursor-pointer w-full"
                      >
                        {/* Swatch */}
                        <div
                          className={[
                            "w-4 h-4 flex-shrink-0 rounded-[2px] transition-all duration-200",
                            isActive
                              ? "ring-1 ring-offset-1 ring-textPrimary dark:ring-textPrimary-dark scale-110"
                              : "ring-1 ring-inset ring-black/10 dark:ring-white/10",
                          ].join(" ")}
                          style={{
                            ...(hex && !isGradient
                              ? { backgroundColor: hex }
                              : isGradient
                                ? { backgroundImage: hex }
                                : {
                                    // unknown color — show a neutral swatch
                                    backgroundColor: "#d0d0d0",
                                  }),
                          }}
                        />
                        {/* Label */}
                        <span
                          className={[
                            "font-sans text-[10px] tracking-wider capitalize leading-tight transition-colors duration-200",
                            isActive
                              ? "text-textPrimary dark:text-textPrimary-dark font-medium"
                              : "text-textSecondary dark:text-textSecondary-dark group-hover:text-textPrimary dark:group-hover:text-textPrimary-dark",
                          ].join(" ")}
                        >
                          {color}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {cleanColors.length > INITIAL_COLOR_COUNT && (
                  <button
                    onClick={() => setShowAllColors((prev) => !prev)}
                    className="text-left font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark mt-4 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {showAllColors
                      ? "Show Less"
                      : `View More (${cleanColors.length - INITIAL_COLOR_COUNT})`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 03 — Price */}
          <div>
            <SectionHeader index="03" title="Price" />
            <div className="pl-6 md:pl-10 pr-4">
              <input
                type="range"
                min={0}
                max={15000}
                step={100}
                value={maxPrice ?? 15000}
                onChange={(e) =>
                  dispatch(
                    setMaxPrice(
                      Number(e.target.value) >= 15000
                        ? undefined
                        : Number(e.target.value),
                    ),
                  )
                }
                className="w-full h-[1px] bg-borderLight dark:bg-borderLight-dark appearance-none cursor-pointer slider-thumb-minimal accent-textPrimary dark:accent-textPrimary-dark"
              />
              <div className="flex justify-between mt-4">
                <span className="font-sans text-[9px] tracking-widest text-textMuted dark:text-textMuted-dark uppercase">
                  0 TL
                </span>
                <span className="font-sans text-[9px] tracking-widest text-textPrimary dark:text-textPrimary-dark uppercase">
                  {maxPrice
                    ? `${maxPrice.toLocaleString("tr-TR")} TL`
                    : "15,000+ TL"}
                </span>
              </div>
            </div>
          </div>

          {/* 04 — Size */}
          {availableSizes.length > 0 && (
            <div className="animate-fade-in">
              <SectionHeader index="04" title="Size" />
              <div className="flex flex-col gap-2 pl-6 md:pl-10">
                {[...letterSizes, ...numericSizes, ...otherSizes].map(
                  (size) => (
                    <FilterOption
                      key={size}
                      label={size}
                      active={selectSizes?.includes(size) ?? false}
                      onClick={() => dispatch(toggleSize(size))}
                    />
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="p-6 md:p-8 border-t border-borderLight dark:border-borderLight-dark bg-bgPrimary dark:bg-bgPrimary-dark flex gap-4 transition-colors duration-500">
          <button
            onClick={() => {
              dispatch(clearFilters());
              onClose();
            }}
            className="flex-1 py-4 border border-borderLight dark:border-borderLight-dark text-textMuted dark:text-textMuted-dark font-sans text-[10px] tracking-[0.2em] uppercase hover:text-textPrimary dark:hover:text-textPrimary-dark transition-all duration-300 bg-transparent cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="flex-[2] py-4 border border-textPrimary dark:border-textPrimary-dark bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[10px] tracking-[0.2em] uppercase hover:opacity-80 transition-all duration-300 cursor-pointer"
          >
            View Results
          </button>
        </div>
      </div>
    </>
  );
};
