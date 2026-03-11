import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "../types";

// 1. Define what the shelf looks like
interface ProductState {
  items: Product[]; // The array of jackets
  isLoading: boolean; // Is the fetch running right now?
  searchTerm: string; // What did the user type in the search bar?
}

// 2. Set the starting values (Before the API loads)
const initialState: ProductState = {
  // YOUR TURN: Fill in the default starting values for items, isLoading, and searchTerm
  items: [],
  isLoading: false,
  searchTerm: "",
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
  },
});
export const { setProducts, setLoading, setSearchTerm } = productSlice.actions;
export default productSlice.reducer;
