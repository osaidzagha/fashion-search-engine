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

  // 1. Grab EVERYTHING from Redux in one clean sweep
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

  useEffect(() => {
    async function loadData() {
      dispatch(setLoading(true));

      // 2. Package the filters exactly how our upgraded api.ts expects them!
      const data = await fetchProductsFromAPI({
        searchTerm,
        page: currentPage,
        brands: selectBrands,
        departments: selectDepartments,
        maxPrice: maxPrice,
      });

      dispatch(setProducts(data.products));
      setTotalPages(data.totalPages);
      dispatch(setLoading(false));
    }
    loadData();
  }, [
    dispatch,
    searchTerm,
    currentPage,
    selectBrands,
    selectDepartments,
    maxPrice,
  ]);
  //  3. CRITICAL: The API will now re-fetch whenever ANY filter changes!

  // Reset to page 1 if the user changes their search OR clicks a new filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectBrands, selectDepartments, maxPrice]);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header Area */}
      <div className="p-6 md:p-8 border-b border-gray-200">
        <h1 className="text-3xl font-bold mb-6 uppercase tracking-wider">
          Fashion Engine
        </h1>
        <SearchBar />
      </div>

      {/* 4. The Layout: Flexbox to put Sidebar on the left, Grid on the right */}
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8">
          {/* Top of Grid: Pagination & Status */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm text-gray-500 uppercase tracking-wide">
              {isLoading
                ? "Loading..."
                : `Page ${currentPage} of ${totalPages || 1}`}
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>

          {/* The Actual Products */}
          {isLoading ? <Spinner /> : <ProductGrid products={products} />}
        </main>
      </div>
    </div>
  );
}
