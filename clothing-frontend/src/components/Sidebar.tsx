import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleBrand,
  setDepartments,
  setMaxPrice,
} from "../store/productSlice";

const BRANDS = ["Zara", "Massimo Dutti"];
const DEPARTMENTS = ["MAN", "WOMAN"];

export function Sidebar() {
  const dispatch = useDispatch();
  const { selectBrands, selectDepartments, maxPrice } = useSelector(
    (state: any) => state.products,
  );
  const [expanded, setExpanded] = useState(false);

  const toggleDepartment = (department: string) => {
    const current = selectDepartments || [];
    dispatch(
      setDepartments(
        current.includes(department)
          ? current.filter((d: string) => d !== department)
          : [...current, department],
      ),
    );
  };

  const activeFilterCount =
    (selectBrands?.length || 0) +
    (selectDepartments?.length || 0) +
    (maxPrice && maxPrice < 15000 ? 1 : 0);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: "sticky",
        top: "89px", // height of your sticky header
        height: "calc(100vh - 89px)",
        flexShrink: 0,
        width: expanded ? "220px" : "52px",
        borderRight: "1px solid #e8e4dc",
        background: "#faf9f6",
        transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── COLLAPSED STATE: icon column ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "52px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "28px",
          gap: "28px",
          opacity: expanded ? 0 : 1,
          transition: "opacity 0.2s ease",
          pointerEvents: expanded ? "none" : "auto",
        }}
      >
        {/* Filter icon */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <line x1="0" y1="1" x2="16" y2="1" stroke="#888" strokeWidth="1" />
            <line x1="3" y1="6" x2="13" y2="6" stroke="#888" strokeWidth="1" />
            <line
              x1="5"
              y1="11"
              x2="11"
              y2="11"
              stroke="#888"
              strokeWidth="1"
            />
          </svg>
          {activeFilterCount > 0 && (
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "9px",
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {activeFilterCount}
              </span>
            </div>
          )}
        </div>

        {/* Brand dots */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            alignItems: "center",
          }}
        >
          {BRANDS.map((brand) => (
            <div
              key={brand}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: selectBrands?.includes(brand)
                  ? "#1a1a1a"
                  : "#d4d0c8",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        {/* Dept dots */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            alignItems: "center",
          }}
        >
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: selectDepartments?.includes(dept)
                  ? "#1a1a1a"
                  : "#d4d0c8",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        {/* Price bar mini */}
        <div
          style={{
            width: "2px",
            height: "40px",
            background: "#e8e4dc",
            borderRadius: "2px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${((maxPrice || 15000) / 15000) * 100}%`,
              background: "#1a1a1a",
              borderRadius: "2px",
              transition: "height 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* ── EXPANDED STATE: full panel ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "220px",
          height: "100%",
          padding: "28px 24px",
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.25s ease 0.1s",
          pointerEvents: expanded ? "auto" : "none",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#aaa",
            }}
          >
            Filters
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                dispatch(setDepartments([]));
                BRANDS.forEach((b) => {
                  if (selectBrands?.includes(b)) dispatch(toggleBrand(b));
                });
                dispatch(setMaxPrice(15000));
              }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#999",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1a1a1a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Brands */}
        <div>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#bbb",
              margin: "0 0 14px",
            }}
          >
            Brand
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {BRANDS.map((brand) => {
              const active = selectBrands?.includes(brand);
              return (
                <button
                  key={brand}
                  onClick={() => dispatch(toggleBrand(brand))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      flexShrink: 0,
                      border: `1px solid ${active ? "#1a1a1a" : "#d4d0c8"}`,
                      background: active ? "#1a1a1a" : "transparent",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <polyline
                          points="1,3 3,5 7,1"
                          stroke="#fff"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "16px",
                      fontWeight: 300,
                      fontStyle: "italic",
                      color: active ? "#1a1a1a" : "#888",
                      transition: "color 0.2s",
                    }}
                  >
                    {brand}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Departments */}
        <div>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#bbb",
              margin: "0 0 14px",
            }}
          >
            Department
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {DEPARTMENTS.map((dept) => {
              const active = selectDepartments?.includes(dept);
              return (
                <button
                  key={dept}
                  onClick={() => toggleDepartment(dept)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      flexShrink: 0,
                      border: `1px solid ${active ? "#1a1a1a" : "#d4d0c8"}`,
                      background: active ? "#1a1a1a" : "transparent",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <polyline
                          points="1,3 3,5 7,1"
                          stroke="#fff"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "16px",
                      fontWeight: 300,
                      fontStyle: "italic",
                      color: active ? "#1a1a1a" : "#888",
                      transition: "color 0.2s",
                    }}
                  >
                    {dept === "MAN" ? "Man" : "Woman"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Price */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "14px",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#bbb",
                margin: 0,
              }}
            >
              Max price
            </p>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "15px",
                fontWeight: 400,
                color: "#1a1a1a",
              }}
            >
              {(maxPrice || 15000).toLocaleString("tr-TR")} TL
            </span>
          </div>

          <input
            type="range"
            min="500"
            max="15000"
            step="500"
            value={maxPrice || 15000}
            onChange={(e) => dispatch(setMaxPrice(Number(e.target.value)))}
            style={{
              width: "100%",
              accentColor: "#1a1a1a",
              cursor: "pointer",
              height: "2px",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                color: "#ccc",
              }}
            >
              500
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                color: "#ccc",
              }}
            >
              15,000
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
