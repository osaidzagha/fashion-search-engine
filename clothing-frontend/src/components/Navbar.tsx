import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { setDepartments } from "../store/productSlice";
import toast from "react-hot-toast"; // 👈 Added toast
import ConfirmModal from "./ConfirmModal"; // 👈 Added modal

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { userInfo } = useSelector((state: RootState) => state.auth);
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false); // 👈 Added state

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else if (document.documentElement.classList.contains("dark")) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  // 👈 Updated Logout Handler
  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    dispatch(logout());
    toast("Logged out successfully", { icon: "👋" });
    navigate("/login");
  };

  const isMen =
    selectDepartments?.includes("Men") || selectDepartments?.includes("MEN");
  const isWomen =
    selectDepartments?.includes("Women") ||
    selectDepartments?.includes("WOMEN");

  const handleDepartmentToggle = (dept: string) => {
    const isActive =
      selectDepartments?.includes(dept) ||
      selectDepartments?.includes(dept.toUpperCase());

    const currentParams = new URLSearchParams(location.search);

    if (isActive) {
      dispatch(setDepartments([]));
      currentParams.delete("department");
    } else {
      dispatch(setDepartments([dept]));
      currentParams.set("department", dept);
    }

    const newSearchString = currentParams.toString();
    const finalUrl = newSearchString ? `?${newSearchString}` : "";
    navigate(`${location.pathname}${finalUrl}`);
  };

  const navLinkBaseStyles =
    "font-sans text-[10px] tracking-widest uppercase transition-colors duration-300";
  const navLinkInactiveStyles =
    "text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark";

  return (
    <>
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

              {/* 👈 Trigger Modal Instead of Direct Logout */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className={`${navLinkBaseStyles} ${navLinkInactiveStyles}`}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>

      {/* 🍞 LOGOUT CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Sign Out"
        message="Are you sure you want to log out of Dope? Your session will be ended."
        confirmText="Sign Out"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
