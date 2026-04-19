import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store"; // Adjust path if needed
import { setSearchTerm } from "../store/productSlice"; // Adjust path if needed

export const SearchBar = () => {
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const handler = setTimeout(() => {
      dispatch(setSearchTerm(inputValue));
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, dispatch]);

  // TODO 3: Read from Redux
  // Use useSelector to grab 'searchTerm' from state.products.searchTerm
  const searchTerm = useSelector(
    (state: RootState) => state.products.searchTerm,
  );

  return (
    <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
      <div
        style={{ position: "relative", display: "flex", alignItems: "center" }}
      >
        {/* Search icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            position: "absolute",
            left: "0",
            transition: "color 0.3s ease",
            flexShrink: 0,
            // TODO 4: Use a ternary. If focused is true -> "#1a1a1a", else -> "#aaa"
            color: focused ? "#1a1a1a" : "#aaa",
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
          placeholder="Search linen shirts, navy blazers, dresses…"
          // TODO 5: Wire up the input to your local state
          // - Bind value to inputValue
          // - onChange updates inputValue
          // - onFocus sets focused to true
          // - onBlur sets focused to false
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "10px 0 10px 24px",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "20px",
            fontWeight: 300,
            color: "#1a1a1a",
            letterSpacing: "0.01em",
            transition: "border-color 0.3s ease",
            caretColor: "#1a1a1a",

            // Font style switches from italic (placeholder) to normal (typing)
            fontStyle: inputValue ? "normal" : "italic",

            // TODO 6: Dynamic border color
            // Use a ternary inside a template literal. If focused is true -> "1px solid #1a1a1a", else -> "1px solid #d4d0c8"
            borderBottom: focused ? "1px solid #1a1a1a" : "1px solid #d4d0c8",
          }}
        />

        {/* Clear button */}
        {/* TODO 7: Use the && operator to ONLY render this button if 'inputValue' is truthy */}
        {inputValue && (
          <button
            onClick={() => setInputValue("")}
            style={{
              position: "absolute",
              right: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.08em",
              color: "#999",
              padding: "4px",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1a1a1a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Live query echo */}
      {/* TODO 8: Use the && operator to ONLY render this paragraph if 'searchTerm' (from Redux) is truthy */}
      {searchTerm && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: "#bbb",
            marginTop: "8px",
            textTransform: "uppercase",
          }}
        >
          Showing results for &ldquo;{searchTerm}&rdquo;
        </p>
      )}
    </div>
  );
};
