import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Watchlist from "./pages/Watchlist";
import { CompareProvider } from "./context/CompareContext";
import { CompareBar } from "./components/CompareBar";
import { CompareOverlay } from "./components/CompareOverlay";
// 👇 1. Import your new files
import ProtectedRoute from "./utils/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import VerifyEmail from "./pages/VerifyEmail";
import ScrollToTop from "./components/ScrollToTop";
import Collection from "./pages/Collection";
import StoreLayout from "./components/StoreLayout"; // 👇 Import the new layout
export default function App() {
  return (
    <CompareProvider>
      <Router>
        <ScrollToTop />

        <Routes>
          {/* 🛍️ THE SHOPPING ZONE (Has Navbars) */}
          <Route element={<StoreLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/search" element={<Collection />} />
            <Route path="/collection/:type" element={<Collection />} />
            <Route path="/watchlist" element={<Watchlist />} />
          </Route>

          {/* 🛑 THE FOCUS ZONE (No Navbars) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify/:token" element={<VerifyEmail />} />

          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>

        <CompareBar />
        <CompareOverlay />
      </Router>
    </CompareProvider>
  );
}
