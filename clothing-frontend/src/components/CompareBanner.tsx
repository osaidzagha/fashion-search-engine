import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ Added useLocation
import { RootState } from "../store/store";
import { clearCompare, toggleCompare } from "../store/productSlice";

export function CompareBanner() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation(); // ✅ Get current route
  const compareQueue = useSelector(
    (state: RootState) => state.products.compareQueue,
  );

  // ✅ Hide if empty OR if we are currently on the compare page
  if (compareQueue.length === 0 || location.pathname === "/compare")
    return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "32px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1a1a1a",
        color: "#fff",
        padding: "16px 24px",
        borderRadius: "100px",
        display: "flex",
        alignItems: "center",
        gap: "24px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {[0, 1].map((index) => {
          const product = compareQueue[index];
          return (
            <div
              key={index}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#333",
                overflow: "hidden",
                border: "2px solid #fff",
                position: "relative",
              }}
            >
              {product ? (
                <>
                  <img
                    src={product.images[0]}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <button
                    onClick={() => dispatch(toggleCompare(product))}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                  >
                    ×
                  </button>
                </>
              ) : (
                <span
                  style={{
                    display: "flex",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#888",
                    fontSize: "18px",
                  }}
                >
                  ?
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: "13px", letterSpacing: "0.05em" }}>
        {compareQueue.length === 1
          ? "Select another item to compare"
          : "Ready to compare!"}
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() => dispatch(clearCompare())}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Clear
        </button>
        <button
          disabled={compareQueue.length < 2}
          onClick={() => navigate("/compare")}
          style={{
            background: compareQueue.length === 2 ? "#fff" : "#444",
            color: compareQueue.length === 2 ? "#1a1a1a" : "#888",
            border: "none",
            padding: "8px 20px",
            borderRadius: "20px",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: "bold",
            cursor: compareQueue.length === 2 ? "pointer" : "not-allowed",
            transition: "all 0.3s ease",
          }}
        >
          Compare
        </button>
      </div>
    </div>
  );
}
