import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { setDepartments } from "../store/productSlice";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { userInfo } = useSelector((state: RootState) => state.auth);
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
      setIsDarkMode(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    dispatch(logout());
    toast("Logged out successfully", { icon: "👋" });
    navigate("/login");
  };

  const isMen = Boolean(
    selectDepartments?.includes("Men") || selectDepartments?.includes("MEN"),
  );
  const isWomen = Boolean(
    selectDepartments?.includes("Women") ||
    selectDepartments?.includes("WOMEN"),
  );

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
    setIsMobileMenuOpen(false);
  };

  const navLinkBase =
    "font-sans text-[10px] tracking-widest uppercase transition-colors duration-300";
  const navLinkInactive =
    "text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark";

  const deptButtonStyle = (isActive: boolean) =>
    `font-sans text-[11px] tracking-widest uppercase pb-1 border-b transition-all duration-300 ease-smooth ${
      isActive
        ? "text-textPrimary dark:text-textPrimary-dark border-textPrimary dark:border-textPrimary-dark"
        : "text-textMuted dark:text-textMuted-dark border-transparent hover:text-textPrimary dark:hover:text-textPrimary-dark"
    }`;

  return (
    <>
      <nav className="sticky top-0 z-[100] bg-bgPrimary/80 dark:bg-bgPrimary-dark/80 backdrop-blur-md border-b border-borderLight dark:border-borderLight-dark transition-colors duration-500 w-full">
        {/* ── Main bar ── */}
        <div className="flex justify-between items-center px-6 md:px-12 py-4 relative">
          {/* LEFT — desktop: dept toggles | mobile: hamburger */}
          <div className="flex items-center">
            {/* Desktop dept toggles */}
            <div className="hidden md:flex gap-6">
              <button
                onClick={() => handleDepartmentToggle("Men")}
                className={deptButtonStyle(isMen)}
              >
                Men
              </button>
              <button
                onClick={() => handleDepartmentToggle("Women")}
                className={deptButtonStyle(isWomen)}
              >
                Women
              </button>
            </div>

            {/* Mobile hamburger → animated X */}
            <button
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              className="md:hidden flex flex-col justify-center gap-[5px] w-6 h-6"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span
                className={`block h-px bg-textPrimary dark:bg-textPrimary-dark origin-center transition-transform duration-300 ease-elegant ${
                  isMobileMenuOpen ? "rotate-45 translate-y-[3px]" : ""
                }`}
              />
              <span
                className={`block h-px bg-textPrimary dark:bg-textPrimary-dark transition-opacity duration-300 ${
                  isMobileMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-px bg-textPrimary dark:bg-textPrimary-dark origin-center transition-transform duration-300 ease-elegant ${
                  isMobileMenuOpen ? "-rotate-45 -translate-y-[9px]" : ""
                }`}
              />
            </button>
          </div>

          {/* CENTER — Logo (always centered) */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 font-heading font-normal text-xl tracking-editorial uppercase text-textPrimary dark:text-textPrimary-dark no-underline transition-opacity hover:opacity-70"
          >
            Dope
          </Link>

          {/* RIGHT — desktop: full links | mobile: theme icon only */}
          <div className="flex items-center gap-6">
            {/* Desktop-only links */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={toggleTheme}
                className={`${navLinkBase} ${navLinkInactive}`}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? "Light" : "Dark"}
              </button>

              {!userInfo ? (
                <>
                  <Link
                    to="/login"
                    className={`${navLinkBase} ${navLinkInactive}`}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className={`${navLinkBase} bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark px-4 py-2 hover:opacity-80 transition-opacity`}
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/watchlist")}
                    className={`${navLinkBase} ${navLinkInactive}`}
                  >
                    Watchlist
                  </button>
                  <span className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
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
                    onClick={() => setIsLogoutModalOpen(true)}
                    className={`${navLinkBase} ${navLinkInactive}`}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>

            {/* Mobile-only: theme toggle as a small symbol */}
            <button
              onClick={toggleTheme}
              className={`md:hidden ${navLinkBase} ${navLinkInactive}`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? "○" : "●"}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        <div
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-elegant border-t border-borderLight dark:border-borderLight-dark ${
            isMobileMenuOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 py-6 flex flex-col gap-6 bg-bgPrimary dark:bg-bgPrimary-dark">
            {/* Dept toggles */}
            <div className="flex gap-6">
              <button
                onClick={() => handleDepartmentToggle("Men")}
                className={deptButtonStyle(isMen)}
              >
                Men
              </button>
              <button
                onClick={() => handleDepartmentToggle("Women")}
                className={deptButtonStyle(isWomen)}
              >
                Women
              </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-borderLight dark:bg-borderLight-dark" />

            {/* Auth section */}
            {!userInfo ? (
              <div className="flex flex-col gap-4">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${navLinkBase} ${navLinkInactive}`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${navLinkBase} bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark px-4 py-3 text-center block`}
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <span className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  Hi, {userInfo?.name?.split(" ")[0] || "Guest"}!
                </span>
                <button
                  onClick={() => {
                    navigate("/watchlist");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`${navLinkBase} ${navLinkInactive} text-left`}
                >
                  Watchlist
                </button>
                {userInfo.role === "admin" && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-sans text-[10px] tracking-widest uppercase text-accentRed hover:opacity-80 transition-opacity"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsLogoutModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`${navLinkBase} ${navLinkInactive} text-left`}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

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
