import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { setDepartments } from "../store/productSlice";
import { Link, useNavigate, useLocation } from "react-router-dom";
// 🚨 IMPORTANT: You will need to import your actual action from productSlice!
// import { setDepartments } from "../store/productSlice";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Read the Global Brain
  const { userInfo } = useSelector((state: RootState) => state.auth);
  const { selectDepartments } = useSelector(
    (state: RootState) => state.products,
  );

  // 2. The Logout Handler
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // 3. Department Helper (Checking Redux State)
  // Assuming selectDepartments is an array like ["Men"] or ["Women"]
  const isMen =
    selectDepartments?.includes("Men") || selectDepartments?.includes("MEN");
  const isWomen =
    selectDepartments?.includes("Women") ||
    selectDepartments?.includes("WOMEN");

  const handleDepartmentToggle = (dept: string) => {
    // Check if the clicked department is already the active one
    const isActive =
      selectDepartments?.includes(dept) ||
      selectDepartments?.includes(dept.toUpperCase());

    if (isActive) {
      // If they click "Men" while already looking at "Men", clear the filter so they see everything
      dispatch(setDepartments([]));
    } else {
      // Otherwise, filter explicitly by the department they clicked
      dispatch(setDepartments([dept]));
    }
  };

  return (
    <nav
      style={{
        background: "#faf9f6",
        borderBottom: "1px solid #e8e4dc",
        padding: "16px 48px",
        position: "sticky",
        top: 0,
        zIndex: 100, // Make sure it sits above the Home header
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* LEFT SIDE: Department Toggle */}
      <div style={{ display: "flex", gap: "24px" }}>
        <button
          onClick={() => handleDepartmentToggle("Men")}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0 0 4px 0",
            color: isMen ? "#1a1a1a" : "#aaa",
            borderBottom: isMen ? "1px solid #1a1a1a" : "1px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          Men
        </button>
        <button
          onClick={() => handleDepartmentToggle("Women")}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0 0 4px 0",
            color: isWomen ? "#1a1a1a" : "#aaa",
            borderBottom: isWomen
              ? "1px solid #1a1a1a"
              : "1px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          Women
        </button>
      </div>

      {/* CENTER: Minimalist Logo */}
      <Link
        to="/"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 400,
          fontSize: "20px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#1a1a1a",
          textDecoration: "none",
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        Dope
      </Link>

      {/* RIGHT SIDE: Dynamic Auth Links */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        {!userInfo ? (
          <>
            <Link
              to="/login"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#888",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1a1a1a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "#1a1a1a",
                color: "#fff",
                padding: "8px 16px",
                textDecoration: "none",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#1a1a1a")
              }
            >
              Register
            </Link>
          </>
        ) : (
          <>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#888",
              }}
            >
              Hi, {userInfo?.name?.split(" ")[0] || "Guest"}!
            </span>

            {userInfo.role === "admin" && (
              <Link
                to="/admin"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#b94040", // Same red as the sale badge!
                  textDecoration: "none",
                }}
              >
                Admin
              </Link>
            )}

            <button
              onClick={handleLogout}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#888",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1a1a1a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
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
