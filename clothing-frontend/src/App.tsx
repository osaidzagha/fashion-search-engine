import "./App.css";
import { useState, useEffect } from "react";
import { Product } from "./types";
import { ProductGrid } from "./components/ProductGrid";
function App() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("http://localhost:5000/api/products");
        const data = await response.json();
        console.log("Fetched products:", data);
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }
    fetchProducts();
  }, []);
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Fashion Engine Ready</h1>
      <ProductGrid products={products} />
    </div>
  );
}

export default App;
