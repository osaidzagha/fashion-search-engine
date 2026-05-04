import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { Link, useNavigate, useLocation } from "react-router-dom";
// ✅ UNCOMMENTED: We need this to talk to Redux
import { setDepartments } from "../store/productSlice";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Read the Global Brain
  const { userInfo } = useSelector((state: RootState) => state.auth);
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  // Theme Toggle State
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // ✅ FIX: Check localStorage on mount so it remembers across refreshes
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else if (document.documentElement.classList.contains("dark")) {
      // Fallback if no localStorage but class exists
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;

    if (html.classList.contains("dark")) {
      // Switch to Light
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      // Switch to Dark
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  // 2. The Logout Handler
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // 3. Department Helper
  const isMen =
    selectDepartments?.includes("Men") || selectDepartments?.includes("MEN");
  const isWomen =
    selectDepartments?.includes("Women") ||
    selectDepartments?.includes("WOMEN");

  const handleDepartmentToggle = (dept: string) => {
    const isActive =
      selectDepartments?.includes(dept) ||
      selectDepartments?.includes(dept.toUpperCase());

    // 1. Grab the CURRENT URL basket so we don't lose other filters (like Category)
    const currentParams = new URLSearchParams(location.search);

    if (isActive) {
      // Turn it off in Redux
      dispatch(setDepartments([]));
      // Remove it from the URL basket
      currentParams.delete("department");
    } else {
      // Turn it on in Redux
      dispatch(setDepartments([dept]));
      // Add or update it in the URL basket
      currentParams.set("department", dept);
    }

    // 2. Build the new URL string safely
    const newSearchString = currentParams.toString();
    const finalUrl = newSearchString ? `?${newSearchString}` : "";

    // 3. Silent Context Update: Just update the URL and stay on the current page!
    navigate(`${location.pathname}${finalUrl}`);
  };

  // Helper string for consistent minimal link styling
  const navLinkBaseStyles =
    "font-sans text-[10px] tracking-widest uppercase transition-colors duration-300";
  const navLinkInactiveStyles =
    "text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark";

  return (
    <nav className="sticky top-0 z-[100] flex justify-between items-center px-6 md:px-12 py-4 bg-bgPrimary/80 dark:bg-bgPrimary-dark/80 backdrop-blur-md border-b border-borderLight dark:border-borderLight-dark transition-colors duration-500 w-full">
      {/* LEFT SIDE: Department Toggle */}
      <div className="flex gap-6">
        <button
          onClick={() => handleDepartmentToggle("Men")}
          className={`font-sans text-[11px] tracking-widest uppercase pb-1 border-b transition-all duration-300 ease-smooth ${
            isMen
              ? "text-textPrimary dark:text-textPrimary-dark border-textPrimary dark:border-textPrimary-dark"
              : "text-textMuted dark:text-textMuted-dark border-transparent hover:text-textPrimary dark:hover:text-textPrimary-dark"
          }`}
        >
          Men
        </button>
        <button
          onClick={() => handleDepartmentToggle("Women")}
          className={`font-sans text-[11px] tracking-widest uppercase pb-1 border-b transition-all duration-300 ease-smooth ${
            isWomen
              ? "text-textPrimary dark:text-textPrimary-dark border-textPrimary dark:border-textPrimary-dark"
              : "text-textMuted dark:text-textMuted-dark border-transparent hover:text-textPrimary dark:hover:text-textPrimary-dark"
          }`}
        >
          Women
        </button>
      </div>

      {/* CENTER: Minimalist Logo */}
      <Link
        to="/"
        className="absolute left-1/2 -translate-x-1/2 font-heading font-normal text-xl tracking-editorial uppercase text-textPrimary dark:text-textPrimary-dark no-underline transition-opacity hover:opacity-70"
      >
        Dope
      </Link>

      {/* RIGHT SIDE: Dynamic Auth & Theme Links */}
      <div className="flex items-center gap-6">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`${navLinkBaseStyles} ${navLinkInactiveStyles} flex items-center gap-1`}
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? "Light" : "Dark"}
        </button>

        {!userInfo ? (
          <>
            <Link
              to="/login"
              className={`${navLinkBaseStyles} ${navLinkInactiveStyles}`}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className={`${navLinkBaseStyles} bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark px-4 py-2 hover:bg-bgHover dark:hover:bg-bgSecondary-dark`}
            >
              Register
            </Link>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/watchlist")}
              className={`${navLinkBaseStyles} ${navLinkInactiveStyles}`}
            >
              Watchlist
            </button>

            <span className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hidden md:inline-block">
              Hi, {userInfo?.name?.split(" ")[0] || "Guest"}!
            </span>

            {userInfo.role === "admin" && (
              <Link
                to="/admin"
                className="font-sans text-[10px] tracking-widest uppercase text-accentRed hover:opacity-80 transition-opacity"
              >
                Admin
              </Link>
            )}

            <button
              onClick={handleLogout}
              className={`${navLinkBaseStyles} ${navLinkInactiveStyles}`}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
