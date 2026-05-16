import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/authSlice";
import toast from "react-hot-toast";
import PageTransition from "../components/PageTransition";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function VerifyOTP() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const submitLock = useRef(false); // ✅ Prevent double submission

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const email = location.state?.email || "";

  useEffect(() => {
    if (!email) {
      toast.error("No email found. Please register again.");
      navigate("/register");
    } else {
      // Auto-focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [email, navigate]);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text/plain")
      .slice(0, 6)
      .split("");
    if (pastedData.some((char) => isNaN(Number(char)))) return;
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      toast.error("Please enter all 6 digits");
      return;
    }

    // ✅ Prevent double submission from slow network / double tap
    if (submitLock.current) return;
    submitLock.current = true;
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        // ✅ If account expired (TTL deleted it), send them back to register
        if (
          response.status === 400 &&
          data.message?.includes("register again")
        ) {
          toast.error("Your session expired. Please register again.");
          navigate("/register");
          return;
        }
        throw new Error(data.message || "Invalid verification code");
      }

      const { token, message, ...userData } = data;
      dispatch(setCredentials({ user: userData, token }));
      toast.success("Account verified. Welcome to DOPE.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      // ✅ Account was TTL-deleted — send back to register
      if (response.status === 404) {
        toast.error("Your session expired. Please register again.");
        navigate("/register");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend code");
      }

      toast.success("New code sent to your email.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark px-4 sm:px-6">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Header */}
          <div className="mb-8 sm:mb-10 text-center">
            <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-4">
              Security Check
            </p>
            <h1 className="font-heading font-light text-3xl sm:text-4xl md:text-5xl tracking-[-0.02em] text-textPrimary dark:text-textPrimary-dark mb-4">
              Enter Code
            </h1>
            <p className="font-sans text-[11px] tracking-wide text-textSecondary dark:text-textSecondary-dark">
              We sent a 6-digit code to <br className="sm:hidden" />
              <span className="text-textPrimary dark:text-textPrimary-dark font-medium break-all">
                {email}
              </span>
            </p>
            <p className="font-sans text-[10px] text-textMuted dark:text-textMuted-dark mt-2">
              Code expires in 30 minutes
            </p>
          </div>

          {/* OTP inputs */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 sm:gap-8"
          >
            <div
              className="flex justify-between gap-1.5 sm:gap-3"
              onPaste={handlePaste}
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
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 text-center font-heading text-xl sm:text-2xl bg-transparent border border-borderLight dark:border-borderLight-dark text-textPrimary dark:text-textPrimary-dark focus:border-textPrimary dark:focus:border-textPrimary-dark focus:outline-none transition-colors duration-200"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full py-3 sm:py-4 font-sans text-[10px] tracking-widest uppercase bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-none cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-200"
            >
              {loading ? "Verifying…" : "Verify Account"}
            </button>
          </form>

          {/* Resend */}
          <p className="mt-6 sm:mt-8 font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark text-center">
            Didn't receive a code?{" "}
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="bg-transparent border-none text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-borderLight hover:decoration-textPrimary dark:hover:decoration-textPrimary-dark cursor-pointer transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resendLoading
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend"}
            </button>
          </p>

          {/* Back to register */}
          <p className="mt-4 font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark text-center">
            Wrong email?{" "}
            <button
              onClick={() => navigate("/register")}
              className="bg-transparent border-none text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-borderLight hover:decoration-textPrimary cursor-pointer transition-colors duration-200"
            >
              Start over
            </button>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
