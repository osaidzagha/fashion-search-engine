import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Watchlist from "./pages/Watchlist";
import { CompareProvider } from "./context/CompareContext";
import { Toaster } from "react-hot-toast";
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

export default function App() {
  return (
    <CompareProvider>
      <div className="min-h-screen w-full bg-bgPrimary dark:bg-bgPrimary-dark text-textPrimary dark:text-textPrimary-dark transition-colors duration-500 ease-smooth">
        <Toaster /* ... your toast config ... */ />

        <Router>
          <ScrollToTop />

          {/* 👇 Drop it in here! */}
          <AnimatedRoutes />

          <CompareBar />
          <CompareOverlay />
        </Router>
      </div>
    </CompareProvider>
  );
}
