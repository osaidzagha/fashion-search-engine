import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Pages
import Home from "../pages/Home";
import ProductDetails from "../pages/ProductDetails";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Watchlist from "../pages/Watchlist";
import AdminDashboard from "../pages/AdminDashboard";
import OAuthCallback from "../pages/OAuthCallback";
import VerifyOTP from "../pages/VerifyOTP";
import Collection from "../pages/Collection";
import Profile from "../pages/Profile";
import ForgotPassword from "../pages/ForgotPassword";

// Layouts & Utils
import StoreLayout from "./StoreLayout";
import ProtectedRoute from "../utils/ProtectedRoute";

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* 🛍️ Public store routes (with Navbar + layout) */}
        <Route element={<StoreLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/search" element={<Collection />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/collection/:type" element={<Collection />} />
          <Route path="/watchlist" element={<Watchlist />} />
        </Route>

        {/* 🔓 Auth / focus routes (no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* 🔐 Any logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* 🔐 Admin only */}
        <Route element={<ProtectedRoute adminOnly={true} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
