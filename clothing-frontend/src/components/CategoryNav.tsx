import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { TAXONOMY, SubCategory } from "../constants/taxonomy";

export const CategoryNav: React.FC = () => {
  const navigate = useNavigate();

  // 1. Grab the active department (e.g., "WOMEN" or "MAN") from Redux
  const activeDepartment = useSelector(
    (state: any) => state.auth?.department || state.shop?.department,
  );

  // 2. State to track which top-level menu is open
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // ─── THE ROUTING ENGINE ──────────────────────────────────────────────────
  const handleNavClick = (item: SubCategory) => {
    const params = new URLSearchParams();

    if (activeDepartment) {
      params.set("departments", activeDepartment);
    }

    params.set("title", item.label);

    switch (item.type) {
      case "search":
        params.set("search", item.q);
        break;
      case "sale":
        params.set("onSale", "true");
        break;
      case "newest":
        params.set("sort", "newest");
        break;
      case "brand":
        params.set("brands", item.q);
        break;
    }

    setActiveMenu(null);
    navigate(`/search?${params.toString()}`);
  };

  // Find the currently active category data to render its children
  const activeCategoryData = TAXONOMY.find((c) => c.key === activeMenu);

  return (
    // The main wrapper is relatively positioned so the dropdown anchors to it.
    // z-50 ensures the navigation sits above all page content.
    <div
      className="relative z-50 border-b border-borderDark dark:border-borderDark-dark bg-bgPrimary dark:bg-bgPrimary-dark transition-colors duration-500 ease-smooth"
      onMouseLeave={() => setActiveMenu(null)}
    >
      {/* ─── TOP LEVEL TABS ─── */}
      <nav className="flex justify-center gap-10 px-8">
        {TAXONOMY.map((category) => {
          const isActive = activeMenu === category.key;
          return (
            <button
              key={category.key}
              onMouseEnter={() => setActiveMenu(category.key)}
              className={`
                py-6 font-sans text-xs tracking-[0.14em] uppercase transition-all duration-300 ease-smooth border-b-2
                ${
                  isActive
                    ? "text-textPrimary dark:text-textPrimary-dark border-textPrimary dark:border-textPrimary-dark"
                    : "text-textSecondary dark:text-textSecondary-dark border-transparent hover:text-textPrimary dark:hover:text-textPrimary-dark"
                }
              `}
            >
              {category.label}
            </button>
          );
        })}
      </nav>

      {/* ─── THE BACKDROP OVERLAY ─── */}
      {/* This renders UNDER the dropdown but OVER the rest of the website */}
      <div
        className={`
          absolute top-full left-0 w-screen h-[100vh] bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-400 ease-elegant pointer-events-none
          ${activeMenu ? "opacity-100" : "opacity-0"}
        `}
      />

      {/* ─── EXPANDED MEGA-MENU ─── */}
      <div
        className={`
          absolute top-full left-0 w-full bg-bgPrimary dark:bg-bgPrimary-dark border-b border-borderDark dark:border-borderDark-dark shadow-premium dark:shadow-premium-dark
          transition-all duration-400 ease-elegant origin-top overflow-hidden
          ${activeMenu ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none"}
        `}
      >
        <div className="max-w-[1400px] mx-auto px-12 py-10">
          {/* Semantic HTML: A clean unordered list */}
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-4 gap-x-12">
            {activeCategoryData?.items.map((item, idx) => {
              // Featured logic: Sale and New Arrivals get special styling
              const isSale = item.type === "sale";
              const isNew = item.type === "newest";
              const isFeatured = isSale || isNew;

              return (
                <li key={idx} className="flex">
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`
                      text-left font-sans text-[13px] capitalize transition-colors duration-200 ease-smooth py-1 w-full
                      ${isSale ? "text-accentRed hover:opacity-70 font-medium" : ""}
                      ${isNew ? "text-textPrimary dark:text-textPrimary-dark font-medium hover:opacity-70" : ""}
                      ${!isFeatured ? "text-textSecondary dark:text-textSecondary-dark hover:text-textPrimary dark:hover:text-textPrimary-dark" : ""}
                    `}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};
