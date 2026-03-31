import { useDispatch, useSelector } from "react-redux";
import {
  toggleBrand,
  setDepartments,
  setMaxPrice,
} from "../store/productSlice";
const BRANDS = ["Zara", "Massimo Dutti"];
const DEPARTMENTS = ["MAN", "WOMAN"];

export function Sidebar() {
  // A. Initialize dispatch
  const dispatch = useDispatch();
  // B. Extract selectBrands, selectDepartments, and maxPrice from Redux state
  const { selectBrands, selectDepartments, maxPrice } = useSelector(
    (state: any) => state.products,
  );

  const toggleDepartment = (department: string) => {
    const currentDepartments = selectDepartments || [];
    if (currentDepartments.includes(department)) {
      dispatch(
        setDepartments(
          currentDepartments.filter((d: string) => d !== department),
        ),
      );
    } else {
      dispatch(setDepartments([...currentDepartments, department]));
    }
  };

  return (
    // The Sidebar container: 64px wide on desktop, full width on mobile, right border
    <aside className="w-full md:w-64 flex-shrink-0 p-6 border-r border-gray-200">
      {/* --- BRANDS SECTION --- */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
          Brands
        </h3>
        <div className="flex flex-col gap-3">
          {BRANDS.map((brand) => (
            <label
              key={brand}
              className="flex items-center cursor-pointer group"
            >
              <input
                type="checkbox"
                className="w-4 h-4 accent-black cursor-pointer"
                checked={selectBrands?.includes(brand) || false}
                onChange={() => dispatch(toggleBrand(brand))}
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-black transition-colors">
                {brand}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* --- DEPARTMENTS SECTION --- */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
          Departments
        </h3>
        <div className="flex flex-col gap-3">
          {DEPARTMENTS.map((department) => (
            <label
              key={department}
              className="flex items-center cursor-pointer group"
            >
              <input
                type="checkbox"
                className="w-4 h-4 accent-black cursor-pointer"
                checked={selectDepartments?.includes(department) || false}
                onChange={() => toggleDepartment(department)}
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-black transition-colors">
                {department}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* --- PRICE SECTION --- */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
          Max Price
        </h3>
        <div className="flex flex-col gap-2">
          <input
            type="range"
            min="500"
            max="15000"
            step="500"
            className="w-full accent-black cursor-pointer"
            value={maxPrice || 15000}
            onChange={(e) => dispatch(setMaxPrice(Number(e.target.value)))}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>500 TL</span>
            <span className="font-bold text-black">
              {maxPrice ? `${maxPrice} TL` : "15000+ TL"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
