import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { fetchProductsFromAPI } from "../services/api";
import { Product } from "../types";
import { ProductGrid } from "../components/ProductGrid";
import { SearchBar } from "../components/SearchBar";
import { FilterDrawer } from "../components/FilterDrawer";
import {
  setProducts,
  setLoading,
  setAvailableSizes,
  setAvailableColors,
  setSearchTerm,
  clearFilters,
} from "../store/productSlice";
import PageTransition from "../components/PageTransition";

// ─── Sort options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Recommended" },
  { value: "discount", label: "Biggest Discount" },
  { value: "lowest", label: "Price ↑" },
  { value: "highest", label: "Price ↓" },
];

// ─── Custom sort control ──────────────────────────────────────────────────────
function SortControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {SORT_OPTIONS.map((opt, i) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              "font-sans text-[9px] md:text-[10px] tracking-widest uppercase px-2.5 py-1 border-none bg-transparent cursor-pointer transition-all duration-200",
              isActive
                ? "text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-[1.5px]"
                : "text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark",
              i < SORT_OPTIONS.length - 1
                ? "after:content-['/'] after:ml-2.5 after:text-borderLight after:dark:text-borderLight-dark after:no-underline after:font-normal"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Collection() {
  const { type } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    dispatch(clearFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // ── URL primitives ────────────────────────────────────────────────────────
  const displayTerm = searchParams.get("search") || "";
  const categoryFromUrl = searchParams.get("category") || "";
  const displayTitle = searchParams.get("title") || "";
  const modeFromUrl = searchParams.get("mode") || "";

  // 🔥 SMART FALLBACK: If the link forgot the category param, extract it from the title
  let derivedQuery = searchParams.get("q") || categoryFromUrl || displayTerm;

  if (!derivedQuery && displayTitle.toLowerCase().includes("on sale")) {
    derivedQuery = displayTitle.replace(/ on sale/i, "").trim();
  }

  const apiQuery = derivedQuery;

  // Force category mode if we derived a query from the title
  const effectiveMode =
    categoryFromUrl || (!categoryFromUrl && apiQuery)
      ? "category"
      : modeFromUrl;

  const currentSort = searchParams.get("sort") || "";
  const brandsFromUrl = searchParams.get("brands") || "";
  const onSaleFromUrl = searchParams.get("onSale") || "";
  const deptsFromUrl = searchParams.get("departments") || "";
  const hasVideoFromUrl = searchParams.get("hasVideo") === "true";

  const urlDepts = deptsFromUrl.split(",").filter(Boolean);

  const {
    isLoading,
    searchTerm,
    selectBrands,
    selectDepartments,
    selectSizes,
    selectColors,
    maxPrice,
    hideOOS,
  } = useSelector((state: RootState) => state.products);

  const selectBrandsStr = (selectBrands || []).join(",");
  const selectDepartmentsStr = (selectDepartments || []).join(",");
  const selectSizesStr = (selectSizes || []).join(",");
  const selectColorsStr = (selectColors || []).join(",");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [newItemsStart, setNewItemsStart] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Header ────────────────────────────────────────────────────────────────
  const getHeaderInfo = () => {
    if (displayTitle)
      return { title: displayTitle, desc: "Explore our curated catalog." };
    if (hasVideoFromUrl)
      return {
        title: "Editor's Choice",
        desc: "Curated picks with video lookbooks.",
      };
    if (currentSort === "newest")
      return {
        title: "New Arrivals",
        desc: "The latest additions to our curation.",
      };
    if (currentSort === "trending")
      return {
        title: "On the Move",
        desc: "Products with recent price activity.",
      };
    if (apiQuery && !type)
      return {
        title: displayTerm
          ? `Results for "${displayTerm}"`
          : `Results for "${apiQuery}"`,
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
      case "mango":
        return { title: "Mango", desc: "Modern Mediterranean style." };
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

  useEffect(() => {
    document.title = `${header.title} — Dope`;
    return () => {
      document.title = "Dope | Fashion Price Tracker";
    };
  }, [header.title]);

  useEffect(() => {
    dispatch(setSearchTerm(apiQuery));
  }, [apiQuery, dispatch]);

  useEffect(() => {
    setCurrentPage(1);
    setDisplayProducts([]);
    setNewItemsStart(0);
  }, [
    type,
    currentSort,
    effectiveMode,
    hasVideoFromUrl,
    onSaleFromUrl,
    brandsFromUrl,
    deptsFromUrl,
    searchTerm,
    selectBrandsStr,
    selectDepartmentsStr,
    selectSizesStr,
    selectColorsStr,
    maxPrice,
    hideOOS,
  ]);

  // ── Fetch data ────────────────────────────────────────────────────────────
  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      dispatch(setLoading(true));
      try {
        const effectiveDepts =
          urlDepts.length > 0 ? urlDepts : selectDepartments || [];

        const filters: any = {
          searchTerm: apiQuery || searchTerm,
          page: currentPage,
          brands: brandsFromUrl ? [brandsFromUrl] : selectBrands,
          departments: effectiveDepts,
          sizes: selectSizes,
          colors: selectColors,
          maxPrice,
          sort: currentSort,
          mode: effectiveMode,
          hasVideo: hasVideoFromUrl || undefined,
          hideOOS: hideOOS || undefined,
        };

        if (type === "sale" || onSaleFromUrl === "true") filters.onSale = true;
        if (type === "zara") filters.brands = ["Zara"];
        if (type === "mango") filters.brands = ["Mango"];
        if (type === "massimo-dutti") filters.brands = ["Massimo Dutti"];
        if (type === "new-in") filters.sort = filters.sort || "newest";

        const data = await fetchProductsFromAPI(filters);

        if (!ignore) {
          if (currentPage === 1) {
            setNewItemsStart(0);
            setDisplayProducts(data.products);
          } else {
            // Functional updater to avoid stale closure on displayProducts.length
            setDisplayProducts((prev) => {
              setNewItemsStart(prev.length);
              return [...prev, ...data.products];
            });
          }
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
    if (currentPage === 1) window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      ignore = true;
    };
  }, [
    searchTerm,
    currentPage,
    selectBrandsStr,
    selectDepartmentsStr,
    selectSizesStr,
    selectColorsStr,
    maxPrice,
    type,
    currentSort,
    effectiveMode,
    hasVideoFromUrl,
    brandsFromUrl,
    onSaleFromUrl,
    deptsFromUrl,
    apiQuery,
    categoryFromUrl,
    hideOOS,
    dispatch,
  ]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          currentPage < totalPages &&
          !isLoading
        ) {
          setCurrentPage((p) => p + 1);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentPage, totalPages, isLoading]);

  const hasActiveFilters =
    (selectBrands?.length || 0) > 0 ||
    (selectColors?.length || 0) > 0 ||
    (selectSizes?.length || 0) > 0 ||
    !!maxPrice ||
    hideOOS;

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set("sort", value);
    else newParams.delete("sort");
    setSearchParams(newParams);
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-bgPrimary dark:bg-bgPrimary-dark">
        {/* ══ CINEMATIC HEADER ══════════════════════════════════════════════ */}
        <div className="px-6 md:px-16 lg:px-24 pt-20 md:pt-28 pb-12 md:pb-16 border-b border-borderLight dark:border-borderLight-dark flex flex-col items-center text-center">
          <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-6">
            {type ? "Curated Catalog" : "Search"}
          </p>
          <h1 className="font-heading font-light text-[clamp(36px,6vw,72px)] leading-none tracking-[-0.02em] text-textPrimary dark:text-textPrimary-dark mb-0">
            {header.title}
          </h1>
          <div className="w-full max-w-[500px] mt-8">
            <SearchBar
              initialValue={displayTitle ? "" : displayTerm}
              variant="compact"
            />
          </div>
        </div>

        {/* ══ LAYOUT ════════════════════════════════════════════════════════ */}
        <div className="flex flex-col flex-1 w-full max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-10 md:py-14 pb-24 md:pb-32">
          {/* ── Utility bar ── */}
          <div className="flex justify-between items-center mb-10 md:mb-12 border-b border-borderLight dark:border-borderLight-dark pb-4">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 font-sans text-[10px] md:text-[11px] tracking-widest uppercase bg-transparent border-none cursor-pointer text-textPrimary dark:text-textPrimary-dark hover:opacity-60 transition-opacity duration-200"
            >
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-textPrimary dark:bg-textPrimary-dark" />
              )}
            </button>

            <div className="flex items-center gap-4 md:gap-8">
              <span className="hidden sm:block font-sans text-[10px] md:text-[11px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                {isLoading && currentPage === 1
                  ? "Curating…"
                  : `${totalCount.toLocaleString()} pieces`}
              </span>

              <SortControl value={currentSort} onChange={handleSortChange} />
            </div>
          </div>

          {/* ── Count on mobile ── */}
          <div className="sm:hidden mb-6">
            <span className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
              {isLoading && currentPage === 1
                ? "Curating…"
                : `${totalCount.toLocaleString()} pieces`}
            </span>
          </div>

          {/* ── Grid / empty state ── */}
          {displayProducts.length === 0 && !isLoading ? (
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
              <ProductGrid
                products={displayProducts}
                isLoading={isLoading && currentPage === 1}
                newItemsStart={newItemsStart}
              />

              {currentPage < totalPages && (
                <div ref={sentinelRef} className="h-8 w-full" />
              )}

              {isLoading && currentPage > 1 && (
                <div className="flex justify-center py-10">
                  <span className="font-sans text-[9px] tracking-[0.25em] uppercase text-textMuted dark:text-textMuted-dark animate-pulse">
                    Loading more
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ══ FILTER DRAWER ═════════════════════════════════════════════════ */}
        <FilterDrawer
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />
      </div>
    </PageTransition>
  );
}
