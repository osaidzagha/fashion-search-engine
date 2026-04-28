import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { fetchProductsFromAPI } from "../services/api";
import { ProductGrid } from "../components/ProductGrid";
import { Spinner } from "../components/Spinner";
import { Sidebar } from "../components/Sidebar";
import CategoryPills from "../components/CategoryPills";
import { SearchBar } from "../components/SearchBar"; // Assuming you still want this accessible
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

  const qFromUrl = searchParams.get("q") || searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "";

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
    const fetchData = async () => {
      dispatch(setLoading(true));
      try {
        const filters: any = {
          searchTerm,
          page: currentPage,
          brands: selectBrands,
          departments: selectDepartments,
          sizes: selectSizes,
          colors: selectColors,
          maxPrice,
          sort: currentSort,
        };

        if (type === "sale") filters.onSale = true;
        if (type === "zara") filters.brands = ["Zara"];
        if (type === "massimo-dutti") filters.brands = ["Massimo Dutti"];
        if (type === "new-in") filters.sort = "newest";

        const data = await fetchProductsFromAPI(filters);

        dispatch(setProducts(data.products));
        dispatch(setAvailableSizes(data.availableSizes || []));
        dispatch(setAvailableColors(data.availableColors || []));
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchData();
    window.scrollTo({ top: 0, behavior: "smooth" });
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

        {/* Inline Search hidden elegantly unless it's a generic search page */}
        <div style={{ width: "100%", maxWidth: "500px", marginTop: "24px" }}>
          <SearchBar initialValue={qFromUrl} variant="compact" />
        </div>
      </div>

      {/* ── 2. EDITORIAL SPLIT LAYOUT ── */}
      <div
        style={{
          display: "flex",
          flex: 1,
          maxWidth: "1800px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* LEFT: Sticky Sidebar (Fixed Width) */}
        <aside
          style={{
            width: "320px",
            borderRight: `1px solid ${theme.colors.borderDark}`,
            padding: "48px 48px 48px 64px",
            position: "sticky",
            top: "80px", // Sticks below the navbar!
            height: "calc(100vh - 80px)",
            overflowY: "auto",
            scrollbarWidth: "none", // Clean aesthetic
          }}
        >
          <style>{`aside::-webkit-scrollbar { display: none; }`}</style>

          <div style={{ marginBottom: "40px" }}>
            <h3
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: theme.colors.textPrimary,
                marginBottom: "24px",
              }}
            >
              Categories
            </h3>
            {/* The Dynamic Pills are now stacked cleanly in the sidebar */}
            <div style={{ marginLeft: "-4px" }}>
              <CategoryPills />
            </div>
          </div>

          <Sidebar />
        </aside>

        {/* RIGHT: Expansive Grid Area */}
        <main style={{ flex: 1, padding: "48px 64px 120px", minWidth: 0 }}>
          {/* Top Utility Bar (Count & Sort) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "48px",
            }}
          >
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
                padding: "8px 0",
                background: "transparent",
                color: theme.colors.textPrimary,
                border: "none",
                borderBottom: `1px solid ${theme.colors.borderDark}`,
                cursor: "pointer",
                outline: "none",
                minWidth: "160px",
                textAlign: "right",
              }}
            >
              <option value="">Recommended</option>
              <option value="lowest">Price: Ascending</option>
              <option value="highest">Price: Descending</option>
            </select>
          </div>

          {/* The Grid / State Handling */}
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: "120px",
              }}
            >
              <Spinner />
            </div>
          ) : products.length === 0 ? (
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
              <ProductGrid products={products} />

              {/* Premium Pagination */}
              {totalPages > 1 && (
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
        </main>
      </div>
    </div>
  );
}
