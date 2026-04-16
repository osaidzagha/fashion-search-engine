import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { logout } from "../store/authSlice";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // 🧠 1. Read the Global Brain
  // We ask Redux: "Is anyone logged in right now?"
  const { userInfo } = useSelector((state: RootState) => state.auth);

  // 🚪 2. The Logout Handler
  const handleLogout = () => {
    dispatch(logout()); // Tells Redux to wipe the memory and localStorage
    navigate("/login"); // Kicks them back to the login screen
  };

  return (
    <nav className="bg-white shadow-md p-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Left Side: Logo */}
        <Link to="/" className="text-xl font-bold tracking-widest uppercase">
          Fashion Engine
        </Link>

        {/* Right Side: Dynamic Auth Links */}
        <div className="flex items-center space-x-6">
          {/* If NO user is logged in, show these... */}
          {!userInfo ? (
            <>
              <Link to="/login" className="text-gray-600 hover:text-black">
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Register
              </Link>
            </>
          ) : (
            /* If a user IS logged in, show these... */
            <>
              <span className="text-sm font-medium text-gray-500">
                {/* 👇 The ? stops the crash, and the || provides a fallback! */}
                Hi, {userInfo?.name?.split(" ")[0] || "Guest"}!{" "}
              </span>

              {/* 👑 The Secret Admin Button */}
              {userInfo.role === "admin" && (
                <Link
                  to="/admin"
                  className="text-red-600 font-bold hover:underline"
                >
                  ⚙️ Admin Panel
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-black"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
