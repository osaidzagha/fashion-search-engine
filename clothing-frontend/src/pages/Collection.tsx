import { useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { fetchProductsFromAPI } from "../services/api";
import { ProductGrid } from "../components/ProductGrid";
import { SearchBar } from "../components/SearchBar";
import { clearFilters } from "../store/productSlice";
import { FilterDrawer } from "../components/FilterDrawer";
import {
  setProducts,
  setLoading,
  setAvailableSizes,
  setAvailableColors,
  setSearchTerm,
  setDepartments,
} from "../store/productSlice";

export default function Collection() {
  const { type } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const location = useLocation();

  const qFromUrl =
    searchParams.get("search") ||
    searchParams.get("q") ||
    searchParams.get("category") ||
    "";
  const currentSort = searchParams.get("sort") || "";
  const displayTitle = searchParams.get("title");
  const deptFromUrl = searchParams.get("department");
  useEffect(() => {
    if (deptFromUrl) {
      dispatch(setDepartments([deptFromUrl]));
    }
  }, [deptFromUrl, dispatch]);
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

  // ── Header dynamics ──────────────────────────────────────────────────────
  const getHeaderInfo = () => {
    if (displayTitle)
      return { title: displayTitle, desc: "Explore our curated catalog." };
    if (qFromUrl && !type)
      return {
        title: `Results for "${qFromUrl}"`,
        desc: "Explore items matching your search.",
      };
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

  // ── Lifecycle ────────────────────────────────────────────────────────────
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
        if (!ignore) dispatch(setLoading(false));
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

  // ── Active filter indicator ──────────────────────────────────────────────
  const hasActiveFilters =
    (selectBrands?.length || 0) > 0 ||
    (selectColors?.length || 0) > 0 ||
    (selectSizes?.length || 0) > 0;

  return (
    <div className="min-h-screen flex flex-col bg-bgPrimary dark:bg-bgPrimary-dark">
      {/* ══ 1. CINEMATIC HEADER ══════════════════════════════════════════════ */}
      <div className="px-6 md:px-16 lg:px-24 pt-20 md:pt-28 pb-12 md:pb-16 border-b border-borderLight dark:border-borderLight-dark flex flex-col items-center text-center">
        <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-6">
          {type ? "Curated Catalog" : "Search"}
        </p>

        <h1 className="font-heading font-light text-[clamp(36px,6vw,72px)] leading-none tracking-[-0.02em] text-textPrimary dark:text-textPrimary-dark mb-0">
          {header.title}
        </h1>

        <div className="w-full max-w-[500px] mt-8">
          <SearchBar
            initialValue={displayTitle ? "" : qFromUrl}
            variant="compact"
          />
        </div>
      </div>

      {/* ══ 2. EDITORIAL FULL-WIDTH LAYOUT ═══════════════════════════════════ */}
      <div className="flex flex-col flex-1 w-full max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-10 md:py-14 pb-24 md:pb-32">
        {/* ── Utility bar ── */}
        <div className="flex justify-between items-center mb-10 md:mb-12 border-b border-borderLight dark:border-borderLight-dark pb-4">
          {/* LEFT: Filter trigger */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 font-sans text-[10px] md:text-[11px] tracking-widest uppercase bg-transparent border-none cursor-pointer text-textPrimary dark:text-textPrimary-dark hover:opacity-60 transition-opacity duration-200 ease-smooth"
          >
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-textPrimary dark:bg-textPrimary-dark" />
            )}
          </button>

          {/* RIGHT: Count + sort */}
          <div className="flex items-baseline gap-6 md:gap-8">
            <span className="font-sans text-[10px] md:text-[11px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
              {isLoading
                ? "Curating…"
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
              className="font-sans text-[10px] md:text-[11px] tracking-widest uppercase bg-transparent text-textPrimary dark:text-textPrimary-dark border-none cursor-pointer outline-none text-right transition-opacity duration-200 hover:opacity-60"
            >
              <option value="">Recommended</option>
              <option value="lowest">Price: Ascending</option>
              <option value="highest">Price: Descending</option>
            </select>
          </div>
        </div>

        {/* ── Grid / empty state ── */}
        {products.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 text-center">
            <p className="font-heading italic text-3xl text-textSecondary dark:text-textSecondary-dark mb-4">
              The archive is empty.
            </p>
            <p className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
              Adjust your filters to discover more.
            </p>
          </div>
        ) : (
          <>
            <ProductGrid products={products} isLoading={isLoading} />

            {/* ── Pagination ── */}
            {totalPages > 1 && !isLoading && (
              <div className="flex justify-center items-center gap-8 md:gap-12 mt-20 pt-10 border-t border-borderLight dark:border-borderLight-dark">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className={[
                    "font-sans text-[10px] tracking-widest uppercase bg-transparent border-none transition-all duration-200 ease-smooth",
                    currentPage <= 1
                      ? "text-borderLight dark:text-borderLight-dark cursor-not-allowed"
                      : "text-textPrimary dark:text-textPrimary-dark cursor-pointer hover:opacity-50",
                  ].join(" ")}
                >
                  Previous
                </button>

                <span className="font-sans text-[11px] tracking-widest text-textMuted dark:text-textMuted-dark">
                  {currentPage}
                  <span className="mx-3 text-borderLight dark:text-borderLight-dark">
                    /
                  </span>
                  {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage >= totalPages}
                  className={[
                    "font-sans text-[10px] tracking-widest uppercase bg-transparent border-none transition-all duration-200 ease-smooth",
                    currentPage >= totalPages
                      ? "text-borderLight dark:text-borderLight-dark cursor-not-allowed"
                      : "text-textPrimary dark:text-textPrimary-dark cursor-pointer hover:opacity-50",
                  ].join(" ")}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ 3. FILTER DRAWER ════════════════════════════════════════════════ */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
    </div>
  );
}
