import { useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { fetchProductsFromAPI } from "../services/api";
import { ProductGrid } from "../components/ProductGrid";
import { SearchBar } from "../components/SearchBar";
import { clearFilters } from "../store/productSlice";
import { FilterDrawer } from "../components/FilterDrawer"; // 👈 IMPORTED NEW DRAWER
import {
  setProducts,
  setLoading,
  setAvailableSizes,
  setAvailableColors,
  setSearchTerm,
} from "../store/productSlice";

// Shared Theme
const theme = {
  colors: {
    bgPrimary: "#faf9f6",
    textPrimary: "#1a1a1a",
    textSecondary: "#888",
    borderDark: "#e8e4dc",
  },
  fonts: {
    sans: "'DM Sans', sans-serif",
    heading: "'Cormorant Garamond', serif",
  },
};

export default function Collection() {
  const { type } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();

  // 👇 1. ADDED FILTER STATE
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    dispatch(clearFilters());
  }, [location.search, dispatch]);
  const qFromUrl =
    searchParams.get("search") ||
    searchParams.get("q") ||
    searchParams.get("category") ||
    "";
  const currentSort = searchParams.get("sort") || "";
  const displayTitle = searchParams.get("title");

  const {
    items: products,
    isLoading,
    searchTerm,
    selectBrands,
    selectDepartments,
    selectSizes,
    selectColors,
    maxPrice,
  } = useSelector((state: RootState) => state.products);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // ── HEADER DYNAMICS ──
  const getHeaderInfo = () => {
    // 👇 1. If we came from the Mega-Menu, use the pretty title
    if (displayTitle) {
      return {
        title: displayTitle,
        desc: "Explore our curated catalog.",
      };
    }

    // 👇 2. If the user typed manually in the Search Bar
    if (qFromUrl && !type) {
      return {
        title: `Results for "${qFromUrl}"`,
        desc: "Explore items matching your search.",
      };
    }
    switch (type) {
      case "sale":
        return {
          title: "Archive Sale",
          desc: "Discover pieces at exceptional prices.",
        };
      case "new-in":
        return {
          title: "New Arrivals",
          desc: "The latest additions to our curation.",
        };
      case "zara":
        return {
          title: "Zara",
          desc: "Contemporary silhouettes and modern tailoring.",
        };
      case "massimo-dutti":
        return {
          title: "Massimo Dutti",
          desc: "Refined elegance and premium materials.",
        };
      default:
        return {
          title: "The Collection",
          desc: "Explore our curated catalog.",
        };
    }
  };

  const header = getHeaderInfo();

  // ── LIFECYCLE ──
  useEffect(() => {
    dispatch(setSearchTerm(qFromUrl));
    setCurrentPage(1);
  }, [qFromUrl, dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectBrands,
    selectDepartments,
    selectSizes,
    selectColors,
    maxPrice,
    type,
  ]);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      dispatch(setLoading(true));
      try {
        const filters: any = {
          searchTerm,
          page: currentPage,
          brands: searchParams.get("brands")
            ? [searchParams.get("brands")]
            : selectBrands,
          departments: selectDepartments,
          sizes: selectSizes,
          colors: selectColors,
          maxPrice,
          sort: currentSort,
        };

        if (type === "sale" || searchParams.get("onSale") === "true")
          filters.onSale = true;
        if (type === "zara") filters.brands = ["Zara"];
        if (type === "massimo-dutti") filters.brands = ["Massimo Dutti"];
        if (type === "new-in") filters.sort = "newest";

        const data = await fetchProductsFromAPI(filters);

        if (!ignore) {
          dispatch(setProducts(data.products));
          dispatch(setAvailableSizes(data.availableSizes || []));
          dispatch(setAvailableColors(data.availableColors || []));
          setTotalPages(data.totalPages);
          setTotalCount(data.totalCount);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        if (!ignore) {
          dispatch(setLoading(false));
        }
      }
    };

    fetchData();
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      ignore = true;
    };
  }, [
    searchTerm,
    currentPage,
    selectBrands,
    selectDepartments,
    selectSizes,
    selectColors,
    maxPrice,
    type,
    currentSort,
    dispatch,
    searchParams,
  ]);

  return (
    <div
      style={{
        background: theme.colors.bgPrimary,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── 1. MINIMALIST CINEMATIC HEADER ── */}
      <div
        style={{
          padding: "100px 64px 60px",
          borderBottom: `1px solid ${theme.colors.borderDark}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: theme.colors.textSecondary,
            marginBottom: "24px",
          }}
        >
          {type ? "Curated Catalog" : "Search"}
        </p>
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "64px",
            fontWeight: 300,
            color: theme.colors.textPrimary,
            margin: "0 0 24px",
            letterSpacing: "-0.02em",
          }}
        >
          {header.title}
        </h1>

        {/* Inline Search */}
        <div style={{ width: "100%", maxWidth: "500px", marginTop: "24px" }}>
          {/* 👇 If we have a pretty title (mega-menu), leave the search box empty! */}
          <SearchBar
            initialValue={displayTitle ? "" : qFromUrl}
            variant="compact"
          />
        </div>
      </div>

      {/* ── 2. EDITORIAL FULL-WIDTH LAYOUT ── */}
      {/* 👇 Removed the Sidebar and flex-row. This is now a clean column. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          maxWidth: "1800px",
          margin: "0 auto",
          width: "100%",
          padding: "48px 64px 120px",
        }}
      >
        {/* Top Utility Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "48px",
            borderBottom: `1px solid ${theme.colors.borderDark}`,
            paddingBottom: "16px",
          }}
        >
          {/* LEFT: Zara-Style Filter Trigger */}
          <button
            onClick={() => setIsFilterOpen(true)}
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: theme.colors.textPrimary,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Filters
            {/* ✅ FIX: Safely check lengths with optional chaining */}
            {((selectBrands?.length || 0) > 0 ||
              (selectColors?.length || 0) > 0 ||
              (selectSizes?.length || 0) > 0) && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  background: "#1a1a1a",
                  borderRadius: "50%",
                }}
              />
            )}
          </button>
          {/* RIGHT: Count & Sort grouped together */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "32px" }}>
            <span
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: "11px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: theme.colors.textSecondary,
              }}
            >
              {isLoading
                ? "Curating..."
                : `${totalCount.toLocaleString()} pieces`}
            </span>

            <select
              value={currentSort}
              onChange={(e) => {
                const newParams = new URLSearchParams(searchParams);
                if (e.target.value) newParams.set("sort", e.target.value);
                else newParams.delete("sort");
                setSearchParams(newParams);
              }}
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: "11px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "transparent",
                color: theme.colors.textPrimary,
                border: "none",
                cursor: "pointer",
                outline: "none",
                textAlign: "right",
              }}
            >
              <option value="">Recommended</option>
              <option value="lowest">Price: Ascending</option>
              <option value="highest">Price: Descending</option>
            </select>
          </div>
        </div>

        {/* The Grid / State Handling */}
        {products.length === 0 && !isLoading ? (
          <div style={{ textAlign: "center", padding: "160px 0" }}>
            <p
              style={{
                fontFamily: theme.fonts.heading,
                fontStyle: "italic",
                fontSize: "32px",
                color: theme.colors.textSecondary,
                margin: "0 0 16px",
              }}
            >
              The archive is empty.
            </p>
            <p
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: theme.colors.textSecondary,
              }}
            >
              Adjust your filters to discover more.
            </p>
          </div>
        ) : (
          <>
            <ProductGrid products={products} isLoading={isLoading} />

            {/* Premium Pagination */}
            {totalPages > 1 && !isLoading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "32px",
                  marginTop: "80px",
                  paddingTop: "40px",
                  borderTop: `1px solid ${theme.colors.borderDark}`,
                }}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "10px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    background: "none",
                    border: "none",
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    color:
                      currentPage <= 1
                        ? theme.colors.borderDark
                        : theme.colors.textPrimary,
                    transition: "color 0.2s",
                  }}
                >
                  Previous
                </button>

                <span
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    color: theme.colors.textSecondary,
                  }}
                >
                  {currentPage}{" "}
                  <span
                    style={{
                      color: theme.colors.borderDark,
                      margin: "0 8px",
                    }}
                  >
                    /
                  </span>{" "}
                  {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage >= totalPages}
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: "10px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    background: "none",
                    border: "none",
                    cursor:
                      currentPage >= totalPages ? "not-allowed" : "pointer",
                    color:
                      currentPage >= totalPages
                        ? theme.colors.borderDark
                        : theme.colors.textPrimary,
                    transition: "color 0.2s",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 👇 3. INJECT THE DRAWER COMPONENT */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
    </div>
  );
}
