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
import AdminDashboard from "./pages/AdminDashboard";
import VerifyEmail from "./pages/VerifyEmail";
import ScrollToTop from "./components/ScrollToTop";
import Collection from "./pages/Collection";
import StoreLayout from "./components/StoreLayout";

export default function App() {
  return (
    <CompareProvider>
      <div className="min-h-screen w-full bg-bgPrimary dark:bg-bgPrimary-dark text-textPrimary dark:text-textPrimary-dark transition-colors duration-500 ease-smooth">
        {/* 🍞 THE DOPE TOASTER */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3500,
            className:
              "!bg-bgPrimary dark:!bg-bgPrimary-dark !text-textPrimary dark:!text-textPrimary-dark !border !border-borderLight dark:!border-borderLight-dark !rounded-none shadow-2xl font-sans text-[10px] tracking-widest uppercase",
            success: {
              iconTheme: {
                primary: "currentColor",
                secondary: "transparent",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#ffffff",
              },
            },
          }}
        />

        <Router>
          <ScrollToTop />

          <Routes>
            {/* 🛍️ THE SHOPPING ZONE (Has Navbars) */}
            <Route element={<StoreLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/search" element={<Collection />} />
              <Route path="/collection" element={<Collection />} />
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

          {/* Overlays rendered outside StoreLayout will now correctly inherit the dark/light mode transitions */}
          <CompareBar />
          <CompareOverlay />
        </Router>
      </div>
    </CompareProvider>
  );
}
