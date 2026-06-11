import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/api";
import { setCredentials } from "../store/authSlice";
import toast from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { Eye, EyeOff } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ─── Google SVG icon (no external dep) ────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="flex items-center gap-4 my-1">
      <div className="flex-1 h-px bg-borderLight dark:bg-borderLight-dark" />
      <span className="font-sans text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark">
        or
      </span>
      <div className="flex-1 h-px bg-borderLight dark:bg-borderLight-dark" />
    </div>
  );
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await toast.promise(loginUser({ email, password }), {
        loading: "Authenticating…",
        success: "Welcome back.",
        error: (err: any) => err.message || "Invalid credentials.",
      });
      const { token, ...userData } = response;
      dispatch(setCredentials({ user: userData, token }));
      navigate("/");
    } catch {
      // toast.promise already handles the error display
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirects to backend Google OAuth — backend handles callback + JWT
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark px-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-10">
            <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-4">
              Members only
            </p>
            <h1 className="font-heading font-light text-4xl md:text-5xl tracking-[-0.02em] text-textPrimary dark:text-textPrimary-dark">
              Sign In
            </h1>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 mb-6 font-sans text-[10px] tracking-widest uppercase border border-borderLight dark:border-borderLight-dark text-textPrimary dark:text-textPrimary-dark hover:border-textPrimary dark:hover:border-textPrimary-dark hover:bg-borderLight/30 dark:hover:bg-borderLight-dark/20 transition-all duration-200"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <OrDivider />

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-1">
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors duration-200"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 pr-12 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={1.5} />
                  ) : (
                    <Eye size={16} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 font-sans text-[10px] tracking-widest uppercase bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-none cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-200"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark text-center">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-borderLight hover:decoration-textPrimary dark:hover:decoration-textPrimary-dark transition-colors duration-200"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Login;
