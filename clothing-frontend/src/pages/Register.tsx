import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { Eye, EyeOff } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ─── Password rules ───────────────────────────────────────────────────────────
const RULES = [
  {
    id: "length",
    label: "At least 6 characters",
    test: (p: string) => p.length >= 6,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "number",
    label: "One number",
    test: (p: string) => /[0-9]/.test(p),
  },
];

// ─── Google SVG icon ──────────────────────────────────────────────────────────
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

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const allRulesPassed = RULES.every((r) => r.test(password));
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const handleGoogleRegister = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPassed) {
      toast.error("Password doesn't meet requirements.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok && data.message === "User already exists") {
        const resendRes = await fetch(`${API_BASE}/api/auth/resend-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const resendData = await resendRes.json();
        if (resendRes.ok) {
          toast.success(
            "You already registered — new code sent to your email.",
          );
          navigate("/verify-otp", { state: { email } });
          return;
        } else if (resendData.message === "Account already verified.") {
          toast.error("This email is already registered. Please sign in.");
          navigate("/login");
          return;
        } else {
          toast.error(data.message || "Registration failed.");
          return;
        }
      }

      if (!res.ok) {
        toast.error(data.message || "Registration failed.");
        return;
      }

      toast.success(
        data.message || "Account created! Check your email for the code.",
      );
      navigate("/verify-otp", { state: { email: data.email || email } });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark px-4 sm:px-6 py-12">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Header */}
          <div className="mb-8 sm:mb-10">
            <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-4">
              New member
            </p>
            <h1 className="font-heading font-light text-3xl sm:text-4xl md:text-5xl tracking-[-0.02em] text-textPrimary dark:text-textPrimary-dark">
              Create an Account
            </h1>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            className="w-full flex items-center justify-center gap-3 py-3.5 mb-6 font-sans text-[10px] tracking-widest uppercase border border-borderLight dark:border-borderLight-dark text-textPrimary dark:text-textPrimary-dark hover:border-textPrimary dark:hover:border-textPrimary-dark hover:bg-borderLight/30 dark:hover:bg-borderLight-dark/20 transition-all duration-200"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <OrDivider />

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 sm:gap-5 mt-1"
          >
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="John Doe"
                className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200 placeholder:text-textMuted/40"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@email.com"
                className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200 placeholder:text-textMuted/40"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 pr-12 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200 placeholder:text-textMuted/40"
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

              {/* Password strength rules */}
              {(passwordFocused || password.length > 0) && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {RULES.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <div key={rule.id} className="flex items-center gap-2">
                        <span
                          className={`text-[10px] transition-colors duration-200 ${passed ? "text-green-500" : "text-textMuted dark:text-textMuted-dark"}`}
                        >
                          {passed ? "✓" : "○"}
                        </span>
                        <span
                          className={`font-sans text-[10px] tracking-wide transition-colors duration-200 ${passed ? "text-green-500" : "text-textMuted dark:text-textMuted-dark"}`}
                        >
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className={`w-full bg-transparent border px-4 py-3 pr-12 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none transition-colors duration-200 placeholder:text-textMuted/40 ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? "border-green-500 focus:border-green-500"
                        : "border-accentRed focus:border-accentRed"
                      : "border-borderLight dark:border-borderLight-dark focus:border-textPrimary dark:focus:border-textPrimary-dark"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors focus:outline-none"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} strokeWidth={1.5} />
                  ) : (
                    <Eye size={16} strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="font-sans text-[10px] text-accentRed mt-0.5">
                  Passwords don't match.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !allRulesPassed || !passwordsMatch}
              className="w-full mt-2 py-3.5 font-sans text-[10px] tracking-widest uppercase bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-none cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-200"
            >
              {loading ? "Creating Account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 sm:mt-8 font-sans text-[10px] tracking-widests uppercase text-textMuted dark:text-textMuted-dark text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-borderLight hover:decoration-textPrimary dark:hover:decoration-textPrimary-dark transition-colors duration-200"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Register;
