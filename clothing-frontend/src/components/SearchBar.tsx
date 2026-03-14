import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { setSearchTerm } from "../store/productSlice";
import { useEffect, useState } from "react";

export const SearchBar = () => {
  const [inputValue, setInputValue] = useState(""); // local state
  // 1. Grab the Walkie-Talkie
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      // dispatch here with inputValue
      dispatch(setSearchTerm(inputValue));
    }, 500);
    return () => clearTimeout(timer); // cleanup here
  }, [inputValue]);

  // 2. Grab the Binoculars (Look at state.products.searchTerm)
  const searchTerm = useSelector(
    (state: RootState) => state.products.searchTerm,
  );

  return (
    <div className="mb-8 flex justify-center">
      <input
        type="text"
        placeholder="Search for jackets, jeans, brands..."
        className="w-full max-w-xl px-5 py-3 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition-all"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
    </div>
  );
};
