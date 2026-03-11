import { configureStore } from "@reduxjs/toolkit";
import productReducer from "./productSlice";

export const store = configureStore({
  reducer: {
    // We register our slice here.
    // We name this section of the vault "products".
    products: productReducer,

    // If we add a User Login later, we would add it here!
    // user: userReducer,
  },
});

// These two lines are strictly for TypeScript.
// They look complicated, but they just tell your app exactly what data is inside the Vault.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
