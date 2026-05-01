import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { CategoryNav } from "./CategoryNav";
import { theme } from "../styles/theme"; // Optional: if you need a specific background

export default function StoreLayout() {
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* These stay locked at the top of the shopping pages */}
      <Navbar />
      <CategoryNav />

      {/* <Outlet /> is the magic portal where React Router injects the actual page (Home, Collection, etc.) */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
