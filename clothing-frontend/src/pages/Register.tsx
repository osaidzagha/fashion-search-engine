import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";
import toast from "react-hot-toast";
import PageTransition from "../components/PageTransition";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const navigate = useNavigate();

  const allRulesPassed = RULES.every((r) => r.test(password));
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRulesPassed) {
      toast.error("Password doesn't meet requirements");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
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

      // ── Already registered but unverified → resend OTP and go to verify page
      if (!res.ok && data.message === "User already exists") {
        // Check if unverified — try resending OTP
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
          toast.error(
            "This email is already registered and verified. Please sign in.",
          );
          navigate("/login");
          return;
        } else {
          toast.error(data.message || "Registration failed");
          return;
        }
      }

      if (!res.ok) {
        toast.error(data.message || "Registration failed");
        return;
      }

      toast.success("Account created! Check your email for the code.");
      navigate("/verify-otp", { state: { email } });
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark px-4 sm:px-6">
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

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 sm:gap-5"
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
                placeholder="you@email.com"
                className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200 placeholder:text-textMuted/40"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                required
                placeholder="Min. 6 characters"
                className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200 placeholder:text-textMuted/40"
              />

              {/* Password rules — show once user starts typing */}
              {(passwordFocused || password.length > 0) && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {RULES.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <div key={rule.id} className="flex items-center gap-2">
                        <span
                          className={`text-[10px] transition-colors duration-200 ${
                            passed
                              ? "text-green-500"
                              : "text-textMuted dark:text-textMuted-dark"
                          }`}
                        >
                          {passed ? "✓" : "○"}
                        </span>
                        <span
                          className={`font-sans text-[10px] tracking-wide transition-colors duration-200 ${
                            passed
                              ? "text-green-500"
                              : "text-textMuted dark:text-textMuted-dark"
                          }`}
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
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat your password"
                className={`w-full bg-transparent border px-4 py-3 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none transition-colors duration-200 placeholder:text-textMuted/40 ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? "border-green-500"
                      : "border-accentRed"
                    : "border-borderLight dark:border-borderLight-dark focus:border-textPrimary dark:focus:border-textPrimary-dark"
                }`}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="font-sans text-[10px] text-accentRed mt-0.5">
                  Passwords don't match
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

          <p className="mt-6 sm:mt-8 font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark text-center">
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
