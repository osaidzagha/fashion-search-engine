import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "../types";

// 1. Define what the shelf looks like
interface ProductState {
  items: Product[];
  availableSizes: string[]; // <--- The dynamic list from the API
  availableColors: string[]; // <--- The dynamic list from the API
  selectSizes: string[]; // <--- What the user actually clicked
  selectColors?: string[]; // <--- What the user actually clicked
  isLoading: boolean;
  searchTerm: string;
  selectBrands?: string[];
  selectDepartments?: string[];
  maxPrice?: number;
}

// 2. Set the starting values (Before the API loads)
const initialState: ProductState = {
  items: [],
  availableSizes: [], // ✅ FIX: Added starting value
  availableColors: [], // ✅ FIX: Added starting value
  isLoading: false,
  searchTerm: "",
  selectBrands: [],
  selectDepartments: [],
  selectSizes: [],
  selectColors: [],
  maxPrice: undefined,
};

// 3. Create the Slice
const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProducts(state, action: PayloadAction<Product[]>) {
      state.items = action.payload;
    },
    // ✅ NEW: Actions to save the dynamic filters from the backend
    setAvailableSizes(state, action: PayloadAction<string[]>) {
      state.availableSizes = action.payload;
    },
    setAvailableColors(state, action: PayloadAction<string[]>) {
      state.availableColors = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    toggleBrand(state, action: PayloadAction<string>) {
      const brand = action.payload;
      if (state.selectBrands?.includes(brand)) {
        state.selectBrands = state.selectBrands.filter((b) => b !== brand);
      } else {
        state.selectBrands?.push(brand);
      }
    },
    setBrands(state, action: PayloadAction<string[]>) {
      state.selectBrands = action.payload;
    },
    toggleSize(state, action: PayloadAction<string>) {
      const size = action.payload;
      if (state.selectSizes?.includes(size)) {
        state.selectSizes = state.selectSizes.filter((s) => s !== size);
      } else {
        state.selectSizes?.push(size);
      }
    },
    toggleColor(state, action: PayloadAction<string>) {
      const color = action.payload;
      if (state.selectColors?.includes(color)) {
        state.selectColors = state.selectColors.filter((c) => c !== color);
      } else {
        state.selectColors?.push(color);
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
  setAvailableSizes, // ✅ NEW
  setAvailableColors, // ✅ NEW
  setLoading,
  setSearchTerm,
  toggleBrand,
  toggleSize,
  toggleColor,
  setDepartments,
  setMaxPrice,
  setBrands,
} = productSlice.actions;

export default productSlice.reducer;
