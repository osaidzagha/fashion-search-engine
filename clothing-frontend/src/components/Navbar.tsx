import React, { useState, useEffect, useRef } from "react";
import { useScrollBehavior } from "../hooks/useScrollBehavior";
import { useSearchOverlay } from "../hooks/useSearchOverlay";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { setDepartments } from "../store/productSlice";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";
import DopeLogo from "./DopeLogo";

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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { isScrolled, isHidden } = useScrollBehavior(12);
  const { open: openSearch } = useSearchOverlay();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    setIsUserMenuOpen(false);
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

  const avatarInitial = userInfo?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <>
      <nav
        className={[
          // ── Base layout ──────────────────────────────────────────────────
          "sticky top-0 z-[100] w-full",
          "border-b border-borderLight dark:border-borderLight-dark",
          // ── Hide on scroll-down (transform only) ─────────────────────────
          "transition-[transform,border-color] duration-300 ease-elegant",
          isHidden ? "-translate-y-full" : "translate-y-0",
        ].join(" ")}
      >
        {/* ── THE FIX: Isolated background blur layer ── */}
        <div
          className={[
            "absolute inset-0 w-full h-full -z-10",
            "transition-[background-color,backdrop-filter] duration-300 ease-elegant",
            isScrolled
              ? "bg-bgPrimary/70 dark:bg-bgPrimary-dark/70 backdrop-blur-xl"
              : "bg-bgPrimary/80 dark:bg-bgPrimary-dark/80 backdrop-blur-md",
          ].join(" ")}
        />

        {/* ── Main bar ── */}
        <div
          className={[
            "flex justify-between items-center px-6 md:px-12 relative",
            // Compact vertical padding when scrolled
            isScrolled ? "py-2.5" : "py-4",
            "transition-[padding] duration-300 ease-elegant",
          ].join(" ")}
        >
          {/* LEFT */}
          <div className="flex items-center">
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

          {/* CENTER — Logo */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 text-textPrimary dark:text-textPrimary-dark no-underline transition-opacity hover:opacity-60"
            aria-label="Dope — Home"
          >
            <DopeLogo size="md" />
          </Link>

          {/* RIGHT */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              {/* Search trigger */}
              <button
                onClick={openSearch}
                aria-label="Search (⌘K)"
                className={`${navLinkBase} ${navLinkInactive} flex items-center gap-2`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="6.5"
                    cy="6.5"
                    r="5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="10.5"
                    y1="10.5"
                    x2="15"
                    y2="15"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="hidden lg:inline text-[8px] tracking-widest opacity-40">
                  ⌘K
                </span>
              </button>
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

                  {/* ── User avatar + dropdown ── */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen((o) => !o)}
                      aria-label="User menu"
                      aria-expanded={isUserMenuOpen}
                      className="w-7 h-7 border border-borderLight dark:border-borderLight-dark flex items-center justify-center hover:border-textPrimary dark:hover:border-textPrimary-dark transition-colors duration-200"
                    >
                      <span className="font-sans text-[10px] tracking-widest text-textPrimary dark:text-textPrimary-dark leading-none">
                        {avatarInitial}
                      </span>
                    </button>

                    {/* Dropdown — minimal: Profile + Log Out only */}
                    <div
                      className={`absolute right-0 top-[calc(100%+0.5rem)] w-44 bg-bgPrimary dark:bg-bgPrimary-dark border border-borderLight dark:border-borderLight-dark shadow-2xl transform-gpu transition-[opacity,transform,visibility] duration-200 ease-out z-[9999] ${
                        isUserMenuOpen
                          ? "opacity-100 translate-y-0 visible"
                          : "opacity-0 -translate-y-2 invisible"
                      }`}
                    >
                      {/* Greeting */}
                      <div className="px-4 py-3 border-b border-borderLight dark:border-borderLight-dark">
                        <p className="font-sans text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark">
                          Signed in as
                        </p>
                        <p className="font-heading font-light text-sm leading-snug text-textPrimary dark:text-textPrimary-dark mt-0.5 truncate">
                          {userInfo.name.split(" ")[0]}
                        </p>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            navigate("/profile");
                          }}
                          className="w-full text-left px-4 py-2.5 font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark hover:bg-borderLight/40 dark:hover:bg-borderLight-dark/20 transition-colors duration-150"
                        >
                          Profile
                        </button>

                        {userInfo.role === "admin" && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              navigate("/admin");
                            }}
                            className="w-full text-left px-4 py-2.5 font-sans text-[9px] tracking-widest uppercase text-accentRed hover:bg-borderLight/40 dark:hover:bg-borderLight-dark/20 transition-colors duration-150"
                          >
                            Admin ↗
                          </button>
                        )}
                      </div>

                      {/* Log Out — separated */}
                      <div className="border-t border-borderLight dark:border-borderLight-dark py-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsLogoutModalOpen(true);
                          }}
                          className="w-full text-left px-4 py-2.5 font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark hover:bg-borderLight/40 dark:hover:bg-borderLight-dark/20 transition-colors duration-150"
                        >
                          Log Out
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile-only: search + theme toggle */}
            <div className="md:hidden flex items-center gap-4">
              <button
                onClick={openSearch}
                aria-label="Search"
                className={`${navLinkBase} ${navLinkInactive}`}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="6.5"
                    cy="6.5"
                    r="5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="10.5"
                    y1="10.5"
                    x2="15"
                    y2="15"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                onClick={toggleTheme}
                className={`${navLinkBase} ${navLinkInactive}`}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? "○" : "●"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        <div
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-elegant border-t border-borderLight dark:border-borderLight-dark ${
            isMobileMenuOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 py-6 flex flex-col gap-6 bg-bgPrimary dark:bg-bgPrimary-dark">
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

            <div className="h-px w-full bg-borderLight dark:bg-borderLight-dark" />

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
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border border-borderLight dark:border-borderLight-dark flex items-center justify-center flex-shrink-0">
                    <span className="font-sans text-[9px] text-textPrimary dark:text-textPrimary-dark">
                      {avatarInitial}
                    </span>
                  </div>
                  <span className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                    {userInfo.name.split(" ")[0]}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigate("/watchlist");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`${navLinkBase} ${navLinkInactive} text-left`}
                >
                  Watchlist
                </button>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`${navLinkBase} ${navLinkInactive} text-left`}
                >
                  Profile
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
                  Log Out
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
