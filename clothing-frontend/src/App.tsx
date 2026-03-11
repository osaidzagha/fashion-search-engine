// src/App.tsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./store/store";
import { setLoading, setProducts } from "./store/productSlice";
import { ProductGrid } from "./components/ProductGrid";
import { fetchProductsFromAPI } from "./services/api";
import { SearchBar } from "./components/SearchBar";
import { filterProductsByName } from "./utils/filters";
import { Spinner } from "./components/Spinner";
function App() {
  const dispatch = useDispatch();
  const products = useSelector((state: RootState) => state.products.items);
  const isLoading = useSelector((state: RootState) => state.products.isLoading);
  const searchTerm = useSelector(
    (state: RootState) => state.products.searchTerm,
  );

  useEffect(() => {
    async function loadData() {
      dispatch(setLoading(true));
      const data = await fetchProductsFromAPI();
      dispatch(setProducts(data));
      dispatch(setLoading(false));
    }
    loadData();
  }, [dispatch]);

  const filteredProducts = filterProductsByName(products, searchTerm);
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Fashion Engine Ready</h1>
      <SearchBar />
      {isLoading ? <Spinner /> : <ProductGrid products={filteredProducts} />}
    </div>
  );
}

export default App;
