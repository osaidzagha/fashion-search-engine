import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { clearFilters } from "../store/productSlice";
import {
  toggleBrand,
  toggleSize,
  toggleColor,
  setMaxPrice,
} from "../store/productSlice";
import { X } from "lucide-react"; // Make sure you have lucide-react installed for the close icon

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ───
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

// ─── Color mapper (Normalized) ───
const getColorHex = (colorName: string) => {
  if (!colorName) return "#E0E0E0";

  const safeColor = colorName.toLowerCase().trim();

  const map: Record<string, string> = {
    black: "#000000",
    white: "#ffffff",
    beige: "#f5f5dc",
    blue: "#4a90e2",
    brown: "#8b4513",
    green: "#50c878",
    grey: "#808080",
    gray: "#808080",
    khaki: "#c3b091",
    navy: "#000080",
    red: "#ff0000",
    pink: "#ffc0cb",
    ecru: "#f5f5dc",
    camel: "#c19a6b",
    anthracite: "#383e42",
    burgundy: "#800020",
  };

  return map[safeColor] || "#E0E0E0";
};
// ─── Minimalist Components ───
function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex gap-4 mb-6">
      <span className="font-sans text-[10px] tracking-widest text-textSecondary uppercase">
        |{index}|
      </span>
      <h3 className="font-sans text-[10px] tracking-widest text-textPrimary uppercase">
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
      className="flex items-center gap-4 w-full text-left group py-1"
    >
      {colorSwatch ? (
        <div
          className="w-3 h-3 border border-borderDark flex-shrink-0"
          style={{ backgroundColor: colorSwatch }}
        />
      ) : (
        <span
          className={`font-sans text-[10px] tracking-widest transition-colors ${active ? "text-textPrimary" : "text-transparent group-hover:text-borderDark"}`}
        >
          ■
        </span>
      )}
      <span
        className={`font-sans text-[10px] tracking-widest uppercase transition-colors ${active ? "text-textPrimary font-medium" : "text-textSecondary group-hover:text-textPrimary"}`}
      >
        {label}
      </span>
    </button>
  );
}

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

  const letterSizes = sortLetterSizes(availableSizes.filter(isLetterSize));
  const numericSizes = sortNumericSizes(availableSizes.filter(isNumericSize));
  const otherSizes = availableSizes.filter(
    (s) => !isLetterSize(s) && !isNumericSize(s),
  );

  return (
    <>
      {/* 1. The Dark Overlay Background */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* 2. The Sliding Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-bgPrimary z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-borderDark/50">
          <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-textPrimary">
            Filters
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:opacity-50 transition-opacity"
          >
            <X size={18} strokeWidth={1} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-12 space-y-16 scrollbar-hide">
          {/* ── 01 Curators ── */}
          <div>
            <SectionHeader index="01" title="Curator" />
            <div className="flex flex-col gap-2 pl-10">
              {["Zara", "Massimo Dutti"].map((brand) => (
                <FilterOption
                  key={brand}
                  label={brand}
                  active={selectBrands?.includes(brand) ?? false}
                  onClick={() => dispatch(toggleBrand(brand))}
                />
              ))}
            </div>
          </div>

          {/* ── 02 Colours ── */}
          {availableColors.length > 0 && (
            <div>
              <SectionHeader index="02" title="Colour" />
              <div className="flex flex-col gap-3 pl-10">
                {availableColors.slice(0, 8).map((color) => (
                  <FilterOption
                    key={color}
                    label={color}
                    active={selectColors?.includes(color) ?? false}
                    colorSwatch={getColorHex(color)}
                    onClick={() => dispatch(toggleColor(color))}
                  />
                ))}
                {availableColors.length > 8 && (
                  <button className="text-left font-sans text-[9px] tracking-widest uppercase text-textSecondary hover:text-textPrimary mt-4 pl-7 transition-colors">
                    View More
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── 03 Price (Minimal Slider) ── */}
          <div>
            <SectionHeader index="03" title="Price" />
            <div className="pl-10 pr-4">
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
                className="w-full h-[1px] bg-textPrimary appearance-none cursor-pointer slider-thumb-minimal"
              />
              <div className="flex justify-between mt-4">
                <span className="font-sans text-[9px] tracking-widest text-textSecondary uppercase">
                  0 TL
                </span>
                <span className="font-sans text-[9px] tracking-widest text-textPrimary uppercase">
                  {maxPrice
                    ? `${maxPrice.toLocaleString("tr-TR")} TL`
                    : "15,000+ TL"}
                </span>
              </div>
            </div>
          </div>

          {/* ── 04 Sizes ── */}
          {availableSizes.length > 0 && (
            <div>
              <SectionHeader index="04" title="Size" />
              <div className="flex flex-col gap-2 pl-10">
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

        {/* Sticky Footer */}
        <div className="p-8 border-t border-borderDark/50 bg-bgPrimary flex gap-4">
          <button
            onClick={() => dispatch(clearFilters())}
            className="w-1/3 py-4 border border-borderDark text-textSecondary font-sans text-[10px] tracking-[0.2em] uppercase hover:text-textPrimary transition-colors duration-300"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="w-2/3 py-4 border border-textPrimary text-textPrimary font-sans text-[10px] tracking-[0.2em] uppercase hover:bg-textPrimary hover:text-bgPrimary transition-colors duration-300"
          >
            View Results
          </button>
        </div>
      </div>
    </>
  );
};
