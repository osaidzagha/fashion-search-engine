import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
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
export default function App() {
  return (
    // 1. Wrap the entire app in the Provider so the state is global
    <CompareProvider>
      <Router>
        <Navbar />
        <ScrollToTop />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 👇 THE FIX: Both routes now point to the Universal Grid! */}
          <Route path="/search" element={<Collection />} />
          <Route path="/collection/:type" element={<Collection />} />
          <Route path="/watchlist" element={<Watchlist />} />

          {/* 🔒 PROTECTED ROUTES */}
          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="/verify/:token" element={<VerifyEmail />} />
        </Routes>

        {/* 2. Put global overlays OUTSIDE the Routes block! */}
        <CompareBar />
        <CompareOverlay />
      </Router>
    </CompareProvider>
  );
}
