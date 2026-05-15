// src/components/SearchBar.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { setSearchTerm } from "../store/productSlice";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// SearchIcon extracted: was copy-pasted identically inside the input row AND
// inside every single suggestion row. Now defined once, used everywhere.
// aria-hidden="true" because it's decorative — the input/listitem text carries
// the semantic meaning.
// ─────────────────────────────────────────────────────────────────────────────
const SearchIcon = ({ className = "" }: { className?: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1" />
    <line
      x1="9"
      y1="9"
      x2="13.5"
      y2="13.5"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
    />
  </svg>
);

interface SearchBarProps {
  initialValue?: string;
  variant?: "hero" | "compact";
}

export const SearchBar = ({
  initialValue = "",
  variant = "compact",
}: SearchBarProps) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  // ── All logic blocks below are untouched ─────────────────────────────────

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (inputValue.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const dept = selectDepartments?.[0];
        const deptQuery = dept
          ? `&departments=${encodeURIComponent(dept)}`
          : "";
        const res = await fetch(
          `${BASE_URL}/api/products/suggestions?q=${encodeURIComponent(
            inputValue,
          )}${deptQuery}`,
        );
        if (!res.ok) throw new Error("Failed");
        const data: string[] = await res.json();
        setSuggestions(data);
        if (focused) setShowDropdown(data.length > 0);
        setHighlightedIdx(-1);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 250);
  }, [inputValue, focused, selectDepartments]);

  const doSearch = (term: string) => {
    if (!term.trim()) return;
    setSuggestions([]);
    setShowDropdown(false);
    dispatch(setSearchTerm(term.trim()));
    navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "Enter") doSearch(inputValue);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
        doSearch(suggestions[highlightedIdx]);
      } else {
        doSearch(inputValue);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIdx(-1);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const isHero = variant === "hero";

  return (
    <div
      className={`
        w-full relative z-[100] mx-auto
        ${isHero ? "max-w-[680px]" : "max-w-[560px]"}
      `}
    >
      {/* ── Input Row ── */}
      <div className="relative flex items-center">
        {/* Icon — color reacts to JS focus state, not CSS :focus,
            because the icon sits outside the input element */}
        <SearchIcon
          className={`
            absolute left-0 flex-shrink-0
            transition-colors duration-200 ease-smooth
            ${
              focused
                ? "text-textPrimary dark:text-textPrimary-dark"
                : "text-textMuted dark:text-textMuted-dark"
            }
          `}
        />

        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-label="Search products"
          placeholder="Search linen shirts, navy blazers, trousers…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setShowDropdown(false), 200);
          }}
          onKeyDown={handleKeyDown}
          className={`
            w-full bg-transparent outline-none
            border-b
            font-heading font-light
            text-textPrimary dark:text-textPrimary-dark
            caret-textPrimary dark:caret-textPrimary-dark
            placeholder:font-heading placeholder:italic
            placeholder:text-textMuted dark:placeholder:text-textMuted-dark
            transition-colors duration-200 ease-smooth text-ellipsis
            ${isHero ? "text-[16px] md:text-[26px] py-3.5 pl-6 md:pl-7" : "text-[14px] md:text-[20px] py-2.5 pl-6"}
            ${inputValue ? "not-italic" : "italic"}
            ${
              focused
                ? "border-textPrimary dark:border-textPrimary-dark"
                : "border-borderDark dark:border-borderDark-dark"
            }
          `}
        />
      </div>

      {/* ── Suggestions Dropdown ── */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Search suggestions"
          className="
            absolute top-[calc(100%+2px)] left-0 right-0
            m-0 p-0 list-none
            bg-bgPrimary dark:bg-bgPrimary-dark
            border border-borderLight dark:border-borderLight-dark
            shadow-premium dark:shadow-premium-dark
            py-2 z-[999]
            transition-colors duration-300 ease-smooth
          "
        >
          {suggestions.map((suggestion, idx) => (
            <li
              key={idx}
              role="option"
              aria-selected={highlightedIdx === idx}
              onMouseDown={(e) => {
                e.preventDefault();
                doSearch(suggestion);
              }}
              onMouseEnter={() => setHighlightedIdx(idx)}
              className={`
                px-6 py-2.5 cursor-pointer
                flex items-center gap-3.5
                transition-colors duration-100 ease-smooth
                ${
                  highlightedIdx === idx
                    ? "bg-bgHover dark:bg-bgHover-dark"
                    : "bg-transparent"
                }
              `}
            >
              <SearchIcon className="w-3 h-3 flex-shrink-0 text-textMuted dark:text-textMuted-dark" />
              <span
                className="
                  font-sans text-[12px] uppercase tracking-[0.08em]
                  text-textPrimary dark:text-textPrimary-dark
                "
              >
                {suggestion}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
