import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { setSearchTerm } from "../store/productSlice";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const HISTORY_KEY = "dope_search_history";
const MAX_HISTORY = 8;

// ─── Icons ────────────────────────────────────────────────────────────────────
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

const ClockIcon = ({ className = "" }: { className?: string }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M12 7v5l3 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// ─── History helpers ──────────────────────────────────────────────────────────
function readHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeHistory(terms: string[]) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(terms.slice(0, MAX_HISTORY)),
    );
  } catch {}
}

function pushToHistory(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const prev = readHistory().filter(
    (t) => t.toLowerCase() !== trimmed.toLowerCase(),
  );
  writeHistory([trimmed, ...prev]);
}

function removeFromHistory(term: string) {
  writeHistory(readHistory().filter((t) => t !== term));
}

// ─── Component ────────────────────────────────────────────────────────────────
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
  const [history, setHistory] = useState<string[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  // ── Sync initialValue when it changes (e.g. navigating between pages) ──
  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  // ── Fetch autocomplete suggestions ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (inputValue.length < 2) {
      setSuggestions([]);
      // Show history when input is short/empty and focused
      if (focused) {
        const h = readHistory();
        setHistory(h);
        setShowDropdown(h.length > 0);
      }
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const dept = selectDepartments?.[0];
        const deptQuery = dept
          ? `&departments=${encodeURIComponent(dept)}`
          : "";
        const res = await fetch(
          `${BASE_URL}/api/products/suggestions?q=${encodeURIComponent(inputValue)}${deptQuery}`,
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
  }, [inputValue, selectDepartments, focused]);

  const doSearch = useCallback(
    (term: string) => {
      if (!term.trim()) return;
      pushToHistory(term.trim());
      setSuggestions([]);
      setShowDropdown(false);
      setHighlightedIdx(-1);
      dispatch(setSearchTerm(term.trim()));
      navigate(`/search?q=${encodeURIComponent(term.trim())}`);
    },
    [dispatch, navigate],
  );

  const handleDeleteHistory = useCallback(
    (e: React.MouseEvent, term: string) => {
      e.preventDefault();
      e.stopPropagation();
      removeFromHistory(term);
      const updated = readHistory();
      setHistory(updated);
      if (updated.length === 0 && inputValue.length < 2) setShowDropdown(false);
    },
    [inputValue],
  );

  const handleClearHistory = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    writeHistory([]);
    setHistory([]);
    setShowDropdown(false);
  }, []);

  const handleFocus = () => {
    setFocused(true);
    if (inputValue.length < 2) {
      const h = readHistory();
      setHistory(h);
      if (h.length > 0) setShowDropdown(true);
    } else if (suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const activeList = inputValue.length >= 2 ? suggestions : history;

    if (!showDropdown || activeList.length === 0) {
      if (e.key === "Enter") doSearch(inputValue);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, activeList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIdx >= 0 && activeList[highlightedIdx]) {
        doSearch(activeList[highlightedIdx]);
      } else {
        doSearch(inputValue);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIdx(-1);
    }
  };

  // Which mode is the dropdown showing
  const isShowingHistory = inputValue.length < 2 && history.length > 0;
  const isShowingSuggestions = inputValue.length >= 2 && suggestions.length > 0;
  const isHero = variant === "hero";

  return (
    <div
      className={`w-full relative z-40 mx-auto ${isHero ? "max-w-[680px]" : "max-w-[560px]"}`}
    >
      <div className="relative flex items-center">
        <SearchIcon
          className={`absolute left-0 flex-shrink-0 transition-colors duration-200 ease-smooth ${
            focused
              ? "text-textPrimary dark:text-textPrimary-dark"
              : "text-textMuted dark:text-textMuted-dark"
          }`}
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
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`
            w-full bg-transparent outline-none border-b
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

        {/* Clear input button */}
        {inputValue && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setInputValue("");
              const h = readHistory();
              setHistory(h);
              setShowDropdown(h.length > 0);
            }}
            className="absolute right-0 p-1 text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors bg-transparent border-none cursor-pointer"
            aria-label="Clear search"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (isShowingHistory || isShowingSuggestions) && (
        <ul
          role="listbox"
          aria-label={
            isShowingHistory ? "Recent searches" : "Search suggestions"
          }
          className="
            absolute top-[calc(100%+2px)] left-0 right-0
            m-0 p-0 list-none
            bg-bgPrimary dark:bg-bgPrimary-dark
            border border-borderLight dark:border-borderLight-dark
            shadow-premium dark:shadow-premium-dark
            py-1 z-50
            transition-colors duration-300 ease-smooth
          "
        >
          {/* History header */}
          {isShowingHistory && (
            <li className="px-5 pt-2 pb-1.5 flex items-center justify-between">
              <span className="font-sans text-[8px] tracking-[0.24em] uppercase text-textMuted dark:text-textMuted-dark">
                Recent searches
              </span>
              <button
                onMouseDown={handleClearHistory}
                className="font-sans text-[8px] tracking-[0.18em] uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark bg-transparent border-none cursor-pointer transition-colors"
              >
                Clear all
              </button>
            </li>
          )}

          {/* Items */}
          {(isShowingHistory ? history : suggestions).map((item, idx) => (
            <li
              key={idx}
              role="option"
              aria-selected={highlightedIdx === idx}
              onMouseDown={(e) => {
                e.preventDefault();
                doSearch(item);
              }}
              onMouseEnter={() => setHighlightedIdx(idx)}
              className={`
                px-5 py-2.5 cursor-pointer flex items-center gap-3.5
                transition-colors duration-100 ease-smooth group
                ${
                  highlightedIdx === idx
                    ? "bg-bgHover dark:bg-bgHover-dark"
                    : "bg-transparent"
                }
              `}
            >
              {isShowingHistory ? (
                <ClockIcon className="flex-shrink-0 text-textMuted dark:text-textMuted-dark" />
              ) : (
                <SearchIcon className="flex-shrink-0 text-textMuted dark:text-textMuted-dark" />
              )}

              <span className="font-sans text-[11px] uppercase tracking-[0.08em] text-textPrimary dark:text-textPrimary-dark flex-1 text-left">
                {item}
              </span>

              {/* Per-item delete for history */}
              {isShowingHistory && (
                <button
                  onMouseDown={(e) => handleDeleteHistory(e, item)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark bg-transparent border-none cursor-pointer transition-all duration-150 flex-shrink-0"
                  aria-label={`Remove "${item}" from history`}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
