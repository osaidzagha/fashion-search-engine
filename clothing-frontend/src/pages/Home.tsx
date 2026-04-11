import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { setLoading, setProducts } from "../store/productSlice";
import { ProductGrid } from "../components/ProductGrid";
import { fetchProductsFromAPI } from "../services/api";
import { SearchBar } from "../components/SearchBar";
import { Spinner } from "../components/Spinner";
import { Sidebar } from "../components/Sidebar";

export default function Home() {
  const dispatch = useDispatch();

  const {
    items: products,
    isLoading,
    searchTerm,
    selectBrands,
    selectDepartments,
    maxPrice,
  } = useSelector((state: RootState) => state.products);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  // TODO 3: The Scroll Listener Effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // TODO 4: The Data Fetching Effect
  useEffect(() => {
    const fetchData = async () => {
      dispatch(setLoading(true));
      try {
        // FIX 1: Passed as a single object {} with correct keys
        const data = await fetchProductsFromAPI({
          searchTerm,
          page: currentPage,
          brands: selectBrands,
          departments: selectDepartments,
          maxPrice: maxPrice,
        });

        // FIX 2: Changed data.items to data.products
        dispatch(setProducts(data.products));
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    // FIX 3: Actually calling the function!
    fetchData();
  }, [
    searchTerm,
    currentPage,
    selectBrands,
    selectDepartments,
    maxPrice,
    dispatch,
  ]);

  // TODO 5: The Reset Pagination Effect
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectBrands, selectDepartments, maxPrice]);

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6" }}>
      {/* ── HERO HEADER ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#faf9f6",
          borderBottom: "1px solid #e8e4dc",
          transition: "padding 0.4s ease",

          // TODO 6: Dynamic Padding based on scroll
          padding: scrolled ? "14px 48px" : "32px 48px 28px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: scrolled ? "12px" : "24px",
            transition: "margin 0.4s ease",
          }}
        >
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#1a1a1a",
              margin: 0,
              transition: "font-size 0.4s ease",

              // Dynamic font size: scrolled ? "22px" : "42px"
              fontSize: scrolled ? "22px" : "42px",
            }}
          >
            Vestire
          </h1>
          {/* Subtitle disappears when scrolled! */}
          {!scrolled && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.2em",
                color: "#aaa",
                textTransform: "uppercase",
                margin: "6px 0 0",
              }}
            >
              Zara &nbsp;&middot;&nbsp; Massimo Dutti
            </p>
          )}
        </div>
        <SearchBar />
      </header>

      {/* ── BODY LAYOUT ── */}
      <div style={{ maxWidth: "1600px", margin: "0 auto", display: "flex" }}>
        {/* We drop the Sidebar component right here! */}
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
                ? "Loading…"
                : `Page ${currentPage} of ${totalPages || 1}`}
            </span>

            {/* Pagination Controls */}
            <div style={{ display: "flex", gap: "1px" }}>
              <button
                // TODO 7A: Prev Button Logic
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1 || isLoading}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px 20px",
                  background: "transparent",
                  border: "1px solid #d4d0c8",
                  transition: "background 0.2s ease, color 0.2s ease",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  color: currentPage <= 1 ? "#ccc" : "#1a1a1a",
                }}
              >
                ← Prev
              </button>
              <button
                // TODO 7B: Next Button Logic
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))
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
                  transition: "background 0.2s ease, color 0.2s ease",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  color: currentPage >= totalPages ? "#ccc" : "#1a1a1a",
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* TODO 8: Conditional Rendering for the Grid */}
          {/* If 'isLoading' is true, render the <Spinner /> wrapped in the centered div. */}
          {/* Else, render the <ProductGrid /> and pass it the 'products' array from Redux. */}
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
          ) : (
            <ProductGrid products={products} />
          )}

          {/* Bottom pagination numbers (Code left intact) */}
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
