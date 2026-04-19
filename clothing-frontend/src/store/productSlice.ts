import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "../types";

// 1. Define what the shelf looks like
interface ProductState {
  items: Product[]; // The array of jackets
  isLoading: boolean; // Is the fetch running right now?
  searchTerm: string; // What did the user type in the search bar?
  selectBrands?: string[]; // Which brands did the user select to filter by?
  selectDepartments?: string[]; // Which departments did the user select to filter by?
  maxPrice?: number; // What is the maximum price the user wants to see?
}

// 2. Set the starting values (Before the API loads)
const initialState: ProductState = {
  items: [],
  isLoading: false,
  searchTerm: "",
  selectBrands: [],
  selectDepartments: [],
  maxPrice: undefined,
};

// 3. Create the Slice (The machine that updates the shelf)
const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    // We will add our update actions here next!
    // YOUR TURN: Create an action to set the products (setProducts)
    setProducts(state, action: PayloadAction<Product[]>) {
      state.items = action.payload;
    },
    // YOUR TURN: Create an action to set the loading state (setLoading)
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    // YOUR TURN: Create an action to set the search term (setSearchTerm)
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    toggleBrand(state, action: PayloadAction<string>) {
      const brand = action.payload;
      // If it's already in the array, remove it. If it's not, add it!
      if (state.selectBrands?.includes(brand)) {
        state.selectBrands = state.selectBrands.filter((b) => b !== brand);
      } else {
        state.selectBrands?.push(brand);
      }
    },
    setDepartments(state, action: PayloadAction<string[]>) {
      state.selectDepartments = action.payload;
    },
    setMaxPrice(state, action: PayloadAction<number | undefined>) {
      state.maxPrice = action.payload;
    },
  },
});
export const {
  setProducts,
  setLoading,
  setSearchTerm,
  toggleBrand,
  setDepartments,
  setMaxPrice,
} = productSlice.actions;
export default productSlice.reducer;
