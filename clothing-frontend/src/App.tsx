import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./store/store";
import { setLoading, setProducts } from "./store/productSlice";
import { ProductGrid } from "./components/ProductGrid";
import { fetchProductsFromAPI } from "./services/api";
import { SearchBar } from "./components/SearchBar";
import { Spinner } from "./components/Spinner";

function App() {
  const dispatch = useDispatch();
  const products = useSelector((state: RootState) => state.products.items);
  const isLoading = useSelector((state: RootState) => state.products.isLoading);
  const searchTerm = useSelector(
    (state: RootState) => state.products.searchTerm,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  useEffect(() => {
    async function loadData() {
      dispatch(setLoading(true));
      const data = await fetchProductsFromAPI(searchTerm, currentPage);
      dispatch(setProducts(data.products));
      setTotalPages(data.totalPages);
      dispatch(setLoading(false));
    }
    loadData();
  }, [dispatch, searchTerm, currentPage]); // 👈 re-fetches every time searchTerm changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page on new search
  }, [searchTerm]);
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Fashion Engine Ready</h1>
      <SearchBar />
      {isLoading ? <Spinner /> : <ProductGrid products={products} />}
      <button
        onClick={() => setCurrentPage((p) => p - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage((p) => p + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
}

export default App;
