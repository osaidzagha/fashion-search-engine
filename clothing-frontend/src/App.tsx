import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";

export default function App() {
  return (
    <Router>
      {/* Anything outside of <Routes> (like a Navbar) would show up on EVERY page */}
      <Routes>
        {/* Route 1: The Main Search Engine */}
        <Route path="/" element={<Home />} />

        {/* Route 2: The Individual Product Page */}
        <Route path="/product/:id" element={<ProductDetails />} />
      </Routes>
    </Router>
  );
}
