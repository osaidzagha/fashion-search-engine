import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SearchResults from "./pages/SearchResults";

// 👇 1. Import your new files
import ProtectedRoute from "./utils/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import VerifyEmail from "./pages/VerifyEmail";
import { CompareBanner } from "./components/CompareBanner";
import Compare from "./pages/Compare";
import ScrollToTop from "./components/ScrollToTop";
import Collection from "./pages/Collection";
export default function App() {
  return (
    <Router>
      <Navbar />
      <CompareBanner />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/collection/:type" element={<Collection />} />

        {/* ========================================== */}
        {/* 🔒 PROTECTED ROUTES                        */}
        {/* ========================================== */}

        {/* Any route placed INSIDE this block requires Admin privileges */}
        <Route element={<ProtectedRoute adminOnly={true} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* The Verification Route */}
        <Route path="/verify/:token" element={<VerifyEmail />} />
      </Routes>
    </Router>
  );
}
