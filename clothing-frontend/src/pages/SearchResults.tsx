import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { ProductGrid } from "../components/ProductGrid";
import { fetchProductsFromAPI } from "../services/api";
import { SearchBar } from "../components/SearchBar";
import { Spinner } from "../components/Spinner";
import { Sidebar } from "../components/Sidebar";
import {
  setProducts,
  setLoading,
  setAvailableSizes,
  setAvailableColors,
  setSearchTerm,
} from "../store/productSlice";

export default function SearchResults() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") || "";

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

  // Sync URL param → Redux searchTerm when URL changes
  useEffect(() => {
    dispatch(setSearchTerm(qFromUrl));
    setCurrentPage(1);
  }, [qFromUrl, dispatch]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectBrands, selectDepartments, selectSizes, selectColors, maxPrice]);

  // Fetch products
  useEffect(() => {
    const fetchData = async () => {
      dispatch(setLoading(true));
      try {
        const data = await fetchProductsFromAPI({
          searchTerm,
          page: currentPage,
          brands: selectBrands,
          departments: selectDepartments,
          sizes: selectSizes,
          colors: selectColors,
          maxPrice,
        });
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
  }, [
    searchTerm,
    currentPage,
    selectBrands,
    selectDepartments,
    selectSizes,
    selectColors,
    maxPrice,
    dispatch,
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6" }}>
      {/* ── Search header ── */}
      <div
        style={{
          borderBottom: "1px solid #e8e4dc",
          padding: "24px 48px",
          background: "#faf9f6",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <SearchBar initialValue={qFromUrl} variant="compact" />
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: "1600px", margin: "0 auto", display: "flex" }}>
        <Sidebar />

        <main style={{ flex: 1, padding: "40px 48px" }}>
          {/* Status bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "32px",
              paddingBottom: "16px",
              borderBottom: "1px solid #e8e4dc",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#aaa",
              }}
            >
              {isLoading
                ? "Searching…"
                : totalCount > 0
                  ? `${totalCount.toLocaleString()} results${qFromUrl ? ` for "${qFromUrl}"` : ""}`
                  : qFromUrl
                    ? `No results for "${qFromUrl}"`
                    : "All products"}
            </span>

            {/* Pagination controls */}
            <div style={{ display: "flex", gap: "1px" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1 || isLoading}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px 20px",
                  background: "transparent",
                  border: "1px solid #d4d0c8",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  color: currentPage <= 1 ? "#ccc" : "#1a1a1a",
                  transition: "color 0.2s ease",
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage >= totalPages || isLoading}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px 20px",
                  background: "transparent",
                  border: "1px solid #d4d0c8",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  color: currentPage >= totalPages ? "#ccc" : "#1a1a1a",
                  transition: "color 0.2s ease",
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Grid or spinner */}
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: "80px",
              }}
            >
              <Spinner />
            </div>
          ) : products.length === 0 ? (
            // Empty state
            <div
              style={{
                textAlign: "center",
                padding: "120px 0",
              }}
            >
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "28px",
                  fontWeight: 300,
                  color: "#ccc",
                  margin: "0 0 16px",
                }}
              >
                Nothing found
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#bbb",
                  margin: "0 0 32px",
                }}
              >
                Try a broader search or different category
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {["Jackets", "Shirts", "Trousers", "Knitwear", "Denim"].map(
                  (s) => (
                    <a
                      key={s}
                      href={`/search?q=${s.toLowerCase()}`}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "10px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#888",
                        textDecoration: "none",
                        border: "1px solid #d4d0c8",
                        padding: "8px 16px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#1a1a1a";
                        e.currentTarget.style.borderColor = "#1a1a1a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#888";
                        e.currentTarget.style.borderColor = "#d4d0c8";
                      }}
                    >
                      {s}
                    </a>
                  ),
                )}
              </div>
            </div>
          ) : (
            <ProductGrid products={products} />
          )}

          {/* Bottom pagination numbers */}
          {!isLoading && totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "4px",
                marginTop: "64px",
                paddingTop: "32px",
                borderTop: "1px solid #e8e4dc",
              }}
            >
              {Array.from(
                { length: Math.min(totalPages, 8) },
                (_, i) => i + 1,
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: "36px",
                    height: "36px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    background:
                      page === currentPage ? "#1a1a1a" : "transparent",
                    color: page === currentPage ? "#fff" : "#888",
                    border: "1px solid",
                    borderColor:
                      page === currentPage ? "#1a1a1a" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
