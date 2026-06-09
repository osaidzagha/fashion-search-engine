import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { Eye, EyeOff } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

type Step = "email" | "otp" | "reset";

// ─── Password rules (mirrors Register) ────────────────────────────────────────
const RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`inline-block h-px transition-all duration-500 ${
            i < current
              ? "w-6 bg-textPrimary dark:bg-textPrimary-dark"
              : i === current
                ? "w-10 bg-textPrimary dark:bg-textPrimary-dark"
                : "w-4 bg-borderLight dark:bg-borderLight-dark"
          }`}
        />
      ))}
    </div>
  );
}

const STEP_INDEX: Record<Step, number> = { email: 0, otp: 1, reset: 2 };

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Auto-focus first OTP box when step changes
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const allRulesPassed = RULES.every((r) => r.test(newPassword));
  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;
  const otpComplete = otp.join("").length === 6;

  // ── Step 1: Send reset code ──
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to send code. Check your email.");
        return;
      }
      toast.success("Check your inbox — code sent.");
      setStep("otp");
      setResendCooldown(60);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: OTP box handlers ──
  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    if (value.length > 1) {
      const chars = value.slice(0, 6).split("");
      const newOtp = [...otp];
      chars.forEach((c, i) => {
        if (i < 6) newOtp[i] = c;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(chars.length, 5)]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const chars = e.clipboardData.getData("text/plain").slice(0, 6).split("");
    if (chars.some((c) => isNaN(Number(c)))) return;
    const newOtp = [...otp];
    chars.forEach((c, i) => {
      if (i < 6) newOtp[i] = c;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(chars.length, 5)]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpComplete) {
      toast.error("Please enter all 6 digits.");
      return;
    }
    // Move to password step — actual OTP verification happens on final submit
    setStep("reset");
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to resend.");
        return;
      }
      toast.success("New code sent.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setResendCooldown(60);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset password ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPassed) {
      toast.error("Password doesn't meet requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.join(""), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Reset failed. Try again.");
        // If OTP was wrong / expired, bounce back to OTP step
        if (res.status === 400) {
          setOtp(["", "", "", "", "", ""]);
          setStep("otp");
        }
        return;
      }
      toast.success("Password reset. You can now sign in.");
      navigate("/login");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step meta ──
  const stepIndex = STEP_INDEX[step];
  const headings: Record<Step, { eyebrow: string; title: string }> = {
    email: { eyebrow: "Account recovery", title: "Reset Password" },
    otp: { eyebrow: "Check your inbox", title: "Enter Code" },
    reset: { eyebrow: "Almost there", title: "New Password" },
  };
  const { eyebrow, title } = headings[step];

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark px-6">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <StepDots current={stepIndex} />

          {/* Header */}
          <div className="mb-10">
            <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-4">
              {eyebrow}
            </p>
            <h1 className="font-heading font-light text-4xl md:text-5xl tracking-[-0.02em] text-textPrimary dark:text-textPrimary-dark">
              {title}
            </h1>
            {step === "otp" && (
              <p className="mt-3 font-sans text-[11px] tracking-wide text-textMuted dark:text-textMuted-dark">
                We sent a 6-digit code to{" "}
                <span className="text-textPrimary dark:text-textPrimary-dark">
                  {email}
                </span>
              </p>
            )}
          </div>

          {/* ══ Step 1: Email ══ */}
          {step === "email" && (
            <form onSubmit={handleSendCode} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  Email Address
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

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 font-sans text-[10px] tracking-widest uppercase bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-none cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-200"
              >
                {loading ? "Sending…" : "Send Reset Code"}
              </button>

              <p className="font-sans text-[10px] tracking-widests uppercase text-textMuted dark:text-textMuted-dark text-center">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-borderLight hover:decoration-textPrimary dark:hover:decoration-textPrimary-dark transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {/* ══ Step 2: OTP ══ */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-8">
              <div
                className="flex justify-between gap-1.5 sm:gap-3"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 text-center font-heading text-xl sm:text-2xl bg-transparent border border-borderLight dark:border-borderLight-dark text-textPrimary dark:text-textPrimary-dark focus:border-textPrimary dark:focus:border-textPrimary-dark focus:outline-none transition-colors duration-200"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={!otpComplete || loading}
                className="w-full py-3.5 font-sans text-[10px] tracking-widest uppercase bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-none cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-200"
              >
                Continue
              </button>

              <div className="flex flex-col gap-3 text-center">
                <p className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  Didn't receive a code?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="bg-transparent border-none text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-borderLight hover:decoration-textPrimary dark:hover:decoration-textPrimary-dark cursor-pointer transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed font-sans text-[10px] tracking-widest uppercase"
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend"}
                  </button>
                </p>
                <p className="font-sans text-[10px] tracking-widests uppercase text-textMuted dark:text-textMuted-dark">
                  Wrong email?{" "}
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="bg-transparent border-none text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-borderLight hover:decoration-textPrimary cursor-pointer font-sans text-[10px] tracking-widest uppercase"
                  >
                    Go back
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ══ Step 3: New password ══ */}
          {step === "reset" && (
            <form
              onSubmit={handleResetPassword}
              className="flex flex-col gap-5"
            >
              {/* New password */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    required
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 pr-12 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200 placeholder:text-textMuted/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors focus:outline-none"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>

                {/* Password strength rules */}
                {(passwordFocused || newPassword.length > 0) && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {RULES.map((rule) => {
                      const passed = rule.test(newPassword);
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

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] tracking-widests uppercase text-textMuted dark:text-textMuted-dark">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
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
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors focus:outline-none"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
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
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ForgotPassword;
