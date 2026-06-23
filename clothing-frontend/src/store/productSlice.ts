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
  compareQueue: Product[];
  trackedProductIds: string[];
  searchTerm: string;
  selectBrands?: string[];
  selectDepartments?: string[];
  maxPrice?: number;
  hideOOS: boolean;             // when true: exclude available:false products from the feed
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
  compareQueue: [],
  trackedProductIds: [],
  selectColors: [],
  maxPrice: undefined,
  hideOOS: false,
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
      if (!state.selectBrands) state.selectBrands = [];
      if (state.selectBrands.includes(brand)) {
        state.selectBrands = state.selectBrands.filter((b) => b !== brand);
      } else {
        state.selectBrands.push(brand);
      }
    },
    setBrands(state, action: PayloadAction<string[]>) {
      state.selectBrands = action.payload;
    },
    toggleSize(state, action: PayloadAction<string>) {
      const size = action.payload;
      if (!state.selectSizes) state.selectSizes = [];
      if (state.selectSizes.includes(size)) {
        state.selectSizes = state.selectSizes.filter((s) => s !== size);
      } else {
        state.selectSizes.push(size);
      }
    },
    toggleColor(state, action: PayloadAction<string>) {
      const color = action.payload;
      if (!state.selectColors) state.selectColors = [];
      if (state.selectColors.includes(color)) {
        state.selectColors = state.selectColors.filter((c) => c !== color);
      } else {
        state.selectColors.push(color);
      }
    },
    setDepartments(state, action: PayloadAction<string[]>) {
      state.selectDepartments = action.payload;
    },
    setMaxPrice(state, action: PayloadAction<number | undefined>) {
      state.maxPrice = action.payload;
    },
    clearFilters(state) {
      state.selectBrands = [];
      state.selectSizes = [];
      state.selectColors = [];
      state.selectDepartments = [];  // also clear department filter
      state.maxPrice = undefined;
      state.hideOOS = false;
    },
    toggleHideOOS(state) {
      state.hideOOS = !state.hideOOS;
    },

    // ─── Compare Feature ───
    toggleCompare(state, action: PayloadAction<Product>) {
      const exists = state.compareQueue.find((p) => p.id === action.payload.id);
      if (exists) {
        state.compareQueue = state.compareQueue.filter(
          (p) => p.id !== action.payload.id,
        );
      } else {
        if (state.compareQueue.length < 2) {
          state.compareQueue.push(action.payload);
        }
      }
    },
    clearCompare(state) {
      state.compareQueue = [];
    },

    // ─── Watchlist / Tracked Items Feature ───
    setTrackedProductIds(state, action: PayloadAction<string[]>) {
      state.trackedProductIds = action.payload;
    },
    toggleTrackedProductId(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.trackedProductIds.includes(id)) {
        state.trackedProductIds = state.trackedProductIds.filter(
          (pid) => pid !== id,
        );
      } else {
        state.trackedProductIds.push(id);
      }
    },
    clearTrackedProductIds(state) {
      state.trackedProductIds = [];
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
  toggleCompare,
  clearCompare,
  clearFilters,
  toggleHideOOS,
  setTrackedProductIds,
  toggleTrackedProductId,
  clearTrackedProductIds,
} = productSlice.actions;

export default productSlice.reducer;
