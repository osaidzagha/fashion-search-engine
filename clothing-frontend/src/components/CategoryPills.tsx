import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux"; // 👈 1. Import useSelector
import { RootState } from "../store/store"; // Adjust path if needed
import { theme } from "../styles/theme";
import { useDispatch } from "react-redux";
import { setSearchTerm, clearFilters } from "../store/productSlice";
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CategoryPills() {
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 👇 2. Listen to the Men/Women button!
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  const activeCategory =
    searchParams.get("q") || searchParams.get("category") || "All";

  useEffect(() => {
    // 👇 3. Attach the department to the URL so the backend knows what we want
    const params = new URLSearchParams();
    if (selectDepartments && selectDepartments.length > 0) {
      params.set("departments", selectDepartments.join(","));
    }

    fetch(`${BASE_URL}/api/products/categories?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(["All", ...data]);
        } else {
          setCategories(["All"]); // Fallback
        }
      })
      .catch((err) => console.error("Failed to load categories:", err));
  }, [selectDepartments]); // 👈 Re-fetch the pills instantly if the user switches Men -> Women

  const handleSelect = (cat: string) => {
    // 1. We still clear the sizes/prices, but we are going to force the department to stay!
    dispatch(clearFilters());

    // 2. Grab the department so we don't lose it
    const deptQuery =
      selectDepartments && selectDepartments.length > 0
        ? `&departments=${selectDepartments.join(",")}`
        : "";

    if (cat === "All") {
      dispatch(setSearchTerm(""));
      // Clean up the URL if it starts with an &
      navigate(`/search?${deptQuery.replace(/^&/, "")}`);
    } else {
      dispatch(setSearchTerm(cat));
      // Append the department to the search query!
      navigate(`/search?q=${encodeURIComponent(cat)}${deptQuery}`);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        overflowX: "auto",
        paddingBottom: "12px",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
      {categories.map((cat) => {
        const isActive = activeCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => handleSelect(cat)}
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: "10px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 20px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: isActive ? theme.colors.textPrimary : "transparent",
              color: isActive
                ? theme.colors.bgPrimary
                : theme.colors.textSecondary,
              border: `1px solid ${isActive ? theme.colors.textPrimary : theme.colors.borderDark}`,
              borderRadius: "40px",
            }}
          >
            {cat.replace(/-/g, " ")}
          </button>
        );
      })}{" "}
      {/* 👈 Removed the semicolon and the stray brace */}
    </div>
  );
}
