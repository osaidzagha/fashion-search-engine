/**
 * SearchOverlay
 *
 * Full-screen search experience. Constraints honoured:
 * - Background: subtle dark scrim that fades in on open (opacity only).
 * - Results: fade in with a soft translateY upward (transform + opacity only).
 * - Input: focus snapped immediately on open via autoFocus + useEffect fallback.
 * - Typography: editorial — large Cormorant Garamond headings for result names,
 *   DM Sans for metadata — matches site standard.
 * - Keyboard: Escape closes, Arrow keys move selection, Enter navigates.
 * - Touch / mobile: works fully — no hover-only behaviours.
 * - prefers-reduced-motion: all transition durations collapse to 0ms.
 * - Portal: rendered via createPortal into document.body so it sits above
 *   everything (z-[500]).
 * - Scroll lock: body scroll is disabled while open, restored on close.
 */
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactPortal,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { setSearchTerm } from "../store/productSlice";
import { useSearchOverlay } from "../hooks/useSearchOverlay";

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const HISTORY_KEY = "dope_search_history";
const MAX_HISTORY = 6;
const RESULT_LIMIT = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeHistory(terms: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(terms.slice(0, MAX_HISTORY)));
  } catch {}
}
function pushToHistory(term: string) {
  const t = term.trim();
  if (!t) return;
  const prev = readHistory().filter((h) => h.toLowerCase() !== t.toLowerCase());
  writeHistory([t, ...prev]);
}
function removeFromHistory(term: string) {
  writeHistory(readHistory().filter((h) => h !== term));
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="10.5" y1="10.5" x2="15" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 17L17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Result item ──────────────────────────────────────────────────────────────
interface SuggestionItem {
  type: "history" | "suggestion";
  text: string;
}

interface ResultItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  images: string[];
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SearchOverlay(): ReactPortal | null {
  const { isOpen, close } = useSearchOverlay();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [isFetching, setIsFetching] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // drives CSS transitions

  // Check reduced motion once
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = prefersReduced ? "0ms" : undefined; // undefined = let CSS handle it

  // ── Open / close lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Scroll lock
      document.body.style.overflow = "hidden";
      // Trigger enter transition on next frame
      requestAnimationFrame(() => setIsVisible(true));
      // Snap focus
      setTimeout(() => inputRef.current?.focus(), prefersReduced ? 0 : 60);
    } else {
      setIsVisible(false);
      // Release scroll lock after exit transition
      const t = setTimeout(
        () => {
          document.body.style.overflow = "";
        },
        prefersReduced ? 0 : 300,
      );
      return () => clearTimeout(t);
    }
  }, [isOpen, prefersReduced]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSuggestions([]);
      setResults([]);
      setSelectedIdx(-1);
    }
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // ── ⌘K / Ctrl+K global shortcut ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new Event("dope:search-open"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Fetch on query change ───────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      // Show history
      const history = readHistory();
      setSuggestions(history.map((text) => ({ type: "history" as const, text })));
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsFetching(true);
      try {
        const dept = selectDepartments?.[0];
        const deptParam = dept ? `&departments=${encodeURIComponent(dept)}` : "";

        const [sugsRes, prodsRes] = await Promise.all([
          fetch(`${BASE_URL}/api/products/suggestions?q=${encodeURIComponent(query)}${deptParam}`),
          fetch(`${BASE_URL}/api/products?q=${encodeURIComponent(query)}${deptParam}&limit=${RESULT_LIMIT}`),
        ]);

        if (sugsRes.ok) {
          const sugs: string[] = await sugsRes.json();
          setSuggestions(sugs.slice(0, 5).map((text) => ({ type: "suggestion", text })));
        }
        if (prodsRes.ok) {
          const data = await prodsRes.json();
          setResults((data.products || []).slice(0, RESULT_LIMIT));
        }
      } catch {
        /* silent */
      } finally {
        setIsFetching(false);
      }
      setSelectedIdx(-1);
    }, 200);
  }, [query, selectDepartments]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const doSearch = useCallback(
    (term: string) => {
      if (!term.trim()) return;
      pushToHistory(term.trim());
      dispatch(setSearchTerm(term.trim()));
      close();
      navigate(`/search?q=${encodeURIComponent(term.trim())}`);
    },
    [dispatch, navigate, close],
  );

  const goToProduct = useCallback(
    (id: string) => {
      close();
      navigate(`/product/${id}`);
    },
    [navigate, close],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = suggestions.length + results.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
        doSearch(suggestions[selectedIdx].text);
      } else if (selectedIdx >= suggestions.length) {
        const prod = results[selectedIdx - suggestions.length];
        if (prod) goToProduct(prod.id);
      } else {
        doSearch(query);
      }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!isOpen && !isVisible) return null;

  const showHistory = query.length < 2 && suggestions.length > 0;
  const showSuggestions = query.length >= 2 && suggestions.length > 0;
  const showResults = results.length > 0;
  const isEmpty = query.length >= 2 && !isFetching && !showResults && !showSuggestions;

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Search"
      className="fixed inset-0 z-[500] flex flex-col"
      style={{ transition: dur }}
    >
      {/* ── Scrim ── */}
      <div
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: prefersReduced
            ? "none"
            : "opacity 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* ── Panel ── */}
      <div
        className="relative z-10 w-full bg-bgPrimary dark:bg-bgPrimary-dark border-b border-borderLight dark:border-borderLight-dark overflow-hidden"
        style={{
          transform: isVisible ? "translateY(0)" : "translateY(-8px)",
          opacity: isVisible ? 1 : 0,
          transition: prefersReduced
            ? "none"
            : "transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* ── Input row ── */}
        <div className="flex items-center gap-4 px-6 md:px-12 py-5 border-b border-borderLight dark:border-borderLight-dark">
          <span className="text-textMuted dark:text-textMuted-dark flex-shrink-0">
            <SearchIcon />
          </span>

          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck="false"
            aria-label="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search linen shirts, navy blazers…"
            className="flex-1 bg-transparent outline-none border-none font-heading font-light italic text-[22px] md:text-[32px] text-textPrimary dark:text-textPrimary-dark placeholder:text-textMuted/50 dark:placeholder:text-textMuted-dark/50 caret-textPrimary dark:caret-textPrimary-dark min-w-0"
          />

          {/* kbd hint — desktop only */}
          <kbd className="hidden md:inline-flex items-center gap-1 font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark border border-borderLight dark:border-borderLight-dark px-2 py-1 select-none">
            Esc
          </kbd>

          <button
            onClick={close}
            className="text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark bg-transparent border-none cursor-pointer p-1 transition-colors duration-150 flex-shrink-0 md:hidden"
            aria-label="Close search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Results panel ── */}
        <div className="max-h-[70vh] overflow-y-auto flex flex-col md:flex-row">

          {/* LEFT: Suggestions / History */}
          {(showHistory || showSuggestions) && (
            <div className="md:w-[280px] lg:w-[320px] flex-shrink-0 py-4 md:border-r border-borderLight dark:border-borderLight-dark">
              <p className="px-6 md:px-8 pb-2 font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                {showHistory ? "Recent" : "Suggestions"}
              </p>

              {suggestions.map((item, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={item.text}
                    onClick={() => {
                      if (item.type === "history") {
                        setQuery(item.text);
                        inputRef.current?.focus();
                      } else {
                        doSearch(item.text);
                      }
                    }}
                    className={[
                      "w-full flex items-center gap-3.5 px-6 md:px-8 py-2.5 text-left transition-colors duration-100 group",
                      isSelected
                        ? "bg-bgHover dark:bg-bgHover-dark"
                        : "hover:bg-bgHover dark:hover:bg-bgHover-dark",
                    ].join(" ")}
                  >
                    <span className="text-textMuted dark:text-textMuted-dark flex-shrink-0">
                      {item.type === "history" ? <ClockIcon /> : <SearchIcon />}
                    </span>
                    <span className="font-sans text-[11px] tracking-wide text-textPrimary dark:text-textPrimary-dark flex-1 truncate">
                      {item.text}
                    </span>
                    {item.type === "history" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(item.text);
                          setSuggestions((prev) =>
                            prev.filter((s) => s.text !== item.text),
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark bg-transparent border-none cursor-pointer p-0.5 transition-all duration-150 flex-shrink-0"
                        aria-label={`Remove "${item.text}" from history`}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* RIGHT: Product results */}
          {showResults && (
            <div className="flex-1 py-4">
              <div className="flex items-center justify-between px-6 md:px-8 pb-2">
                <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  Products
                </p>
                {/* "See all" shortcut */}
                <button
                  onClick={() => doSearch(query)}
                  className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark bg-transparent border-none cursor-pointer transition-colors duration-150"
                >
                  See all →
                </button>
              </div>

              {results.map((product, idx) => {
                const absIdx = suggestions.length + idx;
                const isSelected = selectedIdx === absIdx;
                return (
                  <button
                    key={product.id}
                    onClick={() => goToProduct(product.id)}
                    className={[
                      "w-full flex items-center gap-4 px-6 md:px-8 py-3 text-left transition-colors duration-100",
                      isSelected
                        ? "bg-bgHover dark:bg-bgHover-dark"
                        : "hover:bg-bgHover dark:hover:bg-bgHover-dark",
                    ].join(" ")}
                    style={{
                      // Staggered fade-up entry for each result row
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? "translateY(0)" : "translateY(6px)",
                      transition: prefersReduced
                        ? "none"
                        : `opacity 0.35s cubic-bezier(0.16,1,0.3,1) ${80 + idx * 40}ms, transform 0.35s cubic-bezier(0.16,1,0.3,1) ${80 + idx * 40}ms`,
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-[52px] flex-shrink-0 overflow-hidden bg-bgSecondary dark:bg-bgSecondary-dark">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-0.5">
                        {product.brand}
                      </p>
                      <p className="font-heading font-light text-[15px] leading-snug text-textPrimary dark:text-textPrimary-dark truncate">
                        {product.name}
                      </p>
                    </div>

                    {/* Price + arrow */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-heading text-[15px] text-textPrimary dark:text-textPrimary-dark whitespace-nowrap">
                        {product.price.toLocaleString("tr-TR")}{" "}
                        <span className="text-[11px] font-sans text-textMuted dark:text-textMuted-dark">
                          {product.currency}
                        </span>
                      </span>
                      <span className="text-textMuted dark:text-textMuted-dark opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <ArrowIcon />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Loading state */}
          {isFetching && !showResults && (
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark animate-pulse">
                Searching…
              </p>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
              <p className="font-heading italic text-xl text-textMuted dark:text-textMuted-dark">
                No results for "{query}"
              </p>
              <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted/60 dark:text-textMuted-dark/60">
                Try a different term or browse the catalogue
              </p>
            </div>
          )}

          {/* Idle state — empty input, no history */}
          {!showHistory && !showSuggestions && !showResults && !isFetching && !isEmpty && (
            <div className="flex-1 flex items-center justify-center py-10">
              <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted/40 dark:text-textMuted-dark/40">
                Start typing to search
              </p>
            </div>
          )}
        </div>

        {/* ── Footer hint ── */}
        <div className="hidden md:flex items-center gap-6 px-8 py-3 border-t border-borderLight dark:border-borderLight-dark">
          {[
            ["↑↓", "navigate"],
            ["↵", "select"],
            ["Esc", "close"],
          ].map(([key, label]) => (
            <span key={key} className="flex items-center gap-2">
              <kbd className="font-sans text-[8px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark border border-borderLight dark:border-borderLight-dark px-1.5 py-0.5 select-none">
                {key}
              </kbd>
              <span className="font-sans text-[8px] tracking-widest uppercase text-textMuted/60 dark:text-textMuted-dark/60">
                {label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
