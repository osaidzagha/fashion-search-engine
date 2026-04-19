import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// 1. Define the shape of our User Data
export interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

// 2. Define the shape of our Redux State
interface AuthState {
  userInfo: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
}

// 3. The "Persistence" Check
// When the app starts, we immediately check if they left their VIP wristband in localStorage
const tokenFromStorage = localStorage.getItem("token") || null;
const userFromStorage = localStorage.getItem("userInfo")
  ? JSON.parse(localStorage.getItem("userInfo") as string)
  : null;

const initialState: AuthState = {
  userInfo: userFromStorage,
  token: tokenFromStorage,
  isAuthenticated: !!tokenFromStorage, // Double-bang converts a string/null into a strict boolean
};

// 4. The Brain
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Action 1: User logs in successfully
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserInfo; token: string }>,
    ) => {
      state.userInfo = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;

      // Save to localStorage so they survive a page refresh!
      localStorage.setItem("userInfo", JSON.stringify(action.payload.user));
      localStorage.setItem("token", action.payload.token);
    },

    // Action 2: User clicks logout
    logout: (state) => {
      state.userInfo = null;
      state.token = null;
      state.isAuthenticated = false;

      // Burn the wristband
      localStorage.removeItem("userInfo");
      localStorage.removeItem("token");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
