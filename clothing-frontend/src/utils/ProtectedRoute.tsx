import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

const ProtectedRoute = ({ adminOnly = false }: ProtectedRouteProps) => {
  // 1. Ask the brain who is logged in
  const { userInfo } = useSelector((state: RootState) => state.auth);

  // 2. The "Not Logged In" Check
  if (!userInfo) {
    // If they have no wristband, kick them to the login screen
    // `replace` means they can't hit the "back" arrow to bypass it
    return <Navigate to="/login" replace />;
  }

  // 3. The "Not An Admin" Check
  if (adminOnly && userInfo.role !== "admin") {
    // If they are logged in, but not an admin, kick them to the home page
    return <Navigate to="/" replace />;
  }

  // 4. Access Granted!
  // <Outlet /> is a React Router trick that says "Render whatever component is inside me"
  return <Outlet />;
};

export default ProtectedRoute;
