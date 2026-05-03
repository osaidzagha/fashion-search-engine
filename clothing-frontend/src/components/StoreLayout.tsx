import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { CategoryNav } from "./CategoryNav";

export default function StoreLayout() {
  return (
    <div className="min-h-screen flex flex-col w-full selection:bg-textPrimary selection:text-bgPrimary dark:selection:bg-textPrimary-dark dark:selection:text-bgPrimary-dark">
      {/* These stay locked at the top of the shopping pages */}
      <Navbar />
      <CategoryNav />

      {/* <Outlet /> is the magic portal where React Router injects the actual page (Home, Collection, etc.) */}
      <main className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
