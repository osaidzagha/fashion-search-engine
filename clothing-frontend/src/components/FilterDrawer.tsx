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

// ─── Helpers (Logic Intact) ───
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

// ─── Color mapper ───
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

// ─── Sub-Components ───
function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex gap-4 mb-6 transition-colors duration-500">
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
      className="flex items-center gap-4 w-full text-left group py-1 bg-transparent border-none cursor-pointer"
    >
      {colorSwatch ? (
        <div
          className="w-3 h-3 border border-borderLight dark:border-borderLight-dark flex-shrink-0 transition-colors"
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
        className={`font-sans text-[10px] tracking-widest uppercase transition-all duration-300 ${
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
      {/* 1. Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[150] transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 2. Sliding Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-bgPrimary dark:bg-bgPrimary-dark z-[200] transform transition-transform duration-500 ease-elegant flex flex-col shadow-premium dark:shadow-premium-dark ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-borderLight dark:border-borderLight-dark transition-colors duration-500">
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-12 space-y-16 scrollbar-hide">
          {/* Curator Section */}
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

          {/* Colours Section */}
          {availableColors.length > 0 && (
            <div className="animate-fade-in">
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
                  <button className="text-left font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark mt-4 pl-7 transition-colors bg-transparent border-none cursor-pointer">
                    View More
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Price Section */}
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

          {/* Sizes Section */}
          {availableSizes.length > 0 && (
            <div className="animate-fade-in">
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
        <div className="p-8 border-t border-borderLight dark:border-borderLight-dark bg-bgPrimary dark:bg-bgPrimary-dark flex gap-4 transition-colors duration-500">
          <button
            onClick={() => dispatch(clearFilters())}
            className="flex-1 py-4 border border-borderLight dark:border-borderLight-dark text-textMuted dark:text-textMuted-dark font-sans text-[10px] tracking-[0.2em] uppercase hover:text-textPrimary dark:hover:text-textPrimary-dark transition-all duration-300 bg-transparent cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="flex-[2] py-4 border border-textPrimary dark:border-textPrimary-dark bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark font-sans text-[10px] tracking-[0.2em] uppercase hover:bg-bgHover dark:hover:bg-bgHover-dark hover:border-bgHover transition-all duration-300 cursor-pointer"
          >
            View Results
          </button>
        </div>
      </div>
    </>
  );
};
