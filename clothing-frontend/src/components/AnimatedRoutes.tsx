import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Pages
import Home from "../pages/Home";
import ProductDetails from "../pages/ProductDetails";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Watchlist from "../pages/Watchlist";
import AdminDashboard from "../pages/AdminDashboard";
import VerifyOTP from "../pages/VerifyOTP"; // 👈 IMPORT ADDED
import Collection from "../pages/Collection";

// Layouts & Utils
import StoreLayout from "./StoreLayout";
import ProtectedRoute from "../utils/ProtectedRoute";

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    // mode="wait" is CRITICAL. It tells the app: "Wait for the old page to completely fade out BEFORE sliding the new page in."
    <AnimatePresence mode="wait">
      {/* We pass the location and a unique key so Framer Motion knows when the route changes */}
      <Routes location={location} key={location.pathname}>
        {/* 🛍️ THE SHOPPING ZONE */}
        <Route element={<StoreLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/search" element={<Collection />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/collection/:type" element={<Collection />} />
          <Route path="/watchlist" element={<Watchlist />} />
        </Route>
        {/* 🛑 THE FOCUS ZONE */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />{" "}
        {/* 👈 ROUTE ADDED */}
        <Route element={<ProtectedRoute adminOnly={true} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
