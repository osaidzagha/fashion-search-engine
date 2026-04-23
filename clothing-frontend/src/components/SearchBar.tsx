import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { setSearchTerm } from "../store/productSlice"; // 👈 Add this
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  const [suggestions, setSuggestions] = useState<string[]>([]); // ✅ Now strictly an array of strings
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

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
          `${BASE_URL}/api/products/suggestions?q=${encodeURIComponent(inputValue)}${deptQuery}`,
        );
        if (!res.ok) throw new Error("Failed");

        const data: string[] = await res.json();
        setSuggestions(data);

        if (focused) setShowDropdown(data.length > 0);
        setHighlightedIdx(-1);
      } catch (e) {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 250);
  }, [inputValue, focused, selectDepartments]);

  const doSearch = (term: string) => {
    if (!term.trim()) return;
    setSuggestions([]);
    setShowDropdown(false);
    dispatch(setSearchTerm(term.trim())); // ✅ Save to Redux
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

  const isHero = variant === "hero";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: isHero ? "680px" : "560px",
        margin: "0 auto",
        position: "relative",
        zIndex: 100,
      }}
    >
      {/* Input */}
      <div
        style={{ position: "relative", display: "flex", alignItems: "center" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            position: "absolute",
            left: 0,
            color: focused ? "#1a1a1a" : "#aaa",
            transition: "color 0.2s ease",
          }}
        >
          <circle
            cx="5.5"
            cy="5.5"
            r="4.5"
            stroke="currentColor"
            strokeWidth="1"
          />
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

        <input
          type="text"
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
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: isHero ? "14px 0 14px 28px" : "10px 0 10px 24px",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: isHero ? "26px" : "20px",
            fontWeight: 300,
            color: "#1a1a1a",
            caretColor: "#1a1a1a",
            fontStyle: inputValue ? "normal" : "italic",
            borderBottom: focused ? "1px solid #1a1a1a" : "1px solid #d4d0c8",
            transition: "border-color 0.2s ease",
          }}
        />
      </div>

      {/* ✅ Text-Only Dropdown List */}
      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            background: "#faf9f6",
            border: "1px solid #e8e4dc",
            zIndex: 999,
            boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
            padding: "8px 0",
          }}
        >
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                doSearch(suggestion);
              }}
              onMouseEnter={() => setHighlightedIdx(idx)}
              style={{
                padding: "10px 24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                background: highlightedIdx === idx ? "#f0ede8" : "transparent",
                transition: "background 0.1s ease",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 14 14"
                fill="none"
                style={{ color: "#aaa" }}
              >
                <circle
                  cx="5.5"
                  cy="5.5"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1"
                />
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
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#1a1a1a",
                }}
              >
                {suggestion}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
