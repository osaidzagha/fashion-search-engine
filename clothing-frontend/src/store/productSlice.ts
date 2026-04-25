import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "../types";

// 1. Define what the shelf looks like
interface ProductState {
  items: Product[];
  availableSizes: string[];
  availableColors: string[];
  selectSizes: string[];
  selectColors?: string[];
  isLoading: boolean;
  compareQueue: Product[]; // ✅ Queue state is here
  searchTerm: string;
  selectBrands?: string[];
  selectDepartments?: string[];
  maxPrice?: number;
}

// 2. Set the starting values
const initialState: ProductState = {
  items: [],
  availableSizes: [],
  availableColors: [],
  isLoading: false,
  searchTerm: "",
  selectBrands: [],
  selectDepartments: [],
  selectSizes: [],
  compareQueue: [], // ✅ Queue starts empty
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

    // 👇 NEW: The brain logic for the Compare feature
    toggleCompare(state, action: PayloadAction<Product>) {
      const exists = state.compareQueue.find((p) => p.id === action.payload.id);
      if (exists) {
        // If it's already in the queue, remove it
        state.compareQueue = state.compareQueue.filter(
          (p) => p.id !== action.payload.id,
        );
      } else {
        // If not in queue, add it (strict limit of 2)
        if (state.compareQueue.length < 2) {
          state.compareQueue.push(action.payload);
        }
      }
    },
    clearCompare(state) {
      state.compareQueue = [];
    },
  },
});

export const {
  setProducts,
  setAvailableSizes,
  setAvailableColors,
  setLoading,
  setSearchTerm,
  toggleBrand,
  toggleSize,
  toggleColor,
  setDepartments,
  setMaxPrice,
  setBrands,
  toggleCompare, // ✅ Exported!
  clearCompare, // ✅ Exported!
} = productSlice.actions;

export default productSlice.reducer;
