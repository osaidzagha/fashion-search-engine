import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "./store/authSlice";
import { RootState } from "./store/store";
import { fetchWatchlist } from "./services/api";
import {
  setTrackedProductIds,
  clearTrackedProductIds,
} from "./store/productSlice";
import toast, { Toaster } from "react-hot-toast";

// Existing imports...
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

import Watchlist from "./pages/Watchlist";
import { CompareProvider } from "./context/CompareContext";
import { CompareBar } from "./components/CompareBar";
import { CompareOverlay } from "./components/CompareOverlay";
import ProtectedRoute from "./utils/ProtectedRoute";
import VerifyOTP from "./pages/VerifyOTP";
import AdminDashboard from "./pages/AdminDashboard";
import VerifyEmail from "./pages/VerifyEmail";
import ScrollToTop from "./components/ScrollToTop";
import Collection from "./pages/Collection";
import StoreLayout from "./components/StoreLayout";
import AnimatedRoutes from "./components/AnimatedRoutes";
import { SearchOverlay } from "./components/SearchOverlay";
import { CustomCursor } from "./components/CustomCursor";

// ─── THE CATCHER'S MITT ───────────────────────────────────────────────────────
function GlobalAuthListener() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const handleAuthExpired = () => {
      // 1. Wipe the frontend state
      dispatch(logout());

      // 2. Alert the user
      toast.error("Your session has expired. Please log in again.", {
        duration: 4000,
        position: "top-center",
      });

      // 3. Kick them to the login screen
      navigate("/login");
    };

    // Start listening when the app loads
    window.addEventListener("auth-expired", handleAuthExpired);

    // Clean up the listener when the app unmounts
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, [navigate, dispatch]);

  return null; // This component is invisible!
}
// ──────────────────────────────────────────────────────────────────────────────

// ─── THE HYDRATOR ─────────────────────────────────────────────────────────────
function GlobalWatchlistHydrator() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchWatchlist().then((data: any) => {
        // API may return a plain array OR { items: [...] } — handle both shapes
        const products = Array.isArray(data) ? data : data?.items || [];
        const ids = products.map((p: any) => p.id).filter(Boolean);
        dispatch(setTrackedProductIds(ids));
      }).catch(() => {/* non-fatal — watchlist hearts just show as untracked */});
    } else {
      // Clear the store if they log out
      dispatch(clearTrackedProductIds());
    }
  }, [isAuthenticated, dispatch]);

  return null; // Invisible component
}
// ──────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <CompareProvider>
      <div className="min-h-screen w-full bg-bgPrimary dark:bg-bgPrimary-dark text-textPrimary dark:text-textPrimary-dark transition-colors duration-500 ease-smooth">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: "0",
              padding: "12px 16px",
            },
          }}
        />

        <Router>
          {/* 👇 Drop the listeners inside the Router! */}
          <GlobalAuthListener />
          <GlobalWatchlistHydrator />
          <ScrollToTop />

          <AnimatedRoutes />

          <CustomCursor />
          <SearchOverlay />
          <CompareBar />
          <CompareOverlay />
        </Router>
      </div>
    </CompareProvider>
  );
}
