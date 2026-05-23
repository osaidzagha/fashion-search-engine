import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageTransition from "../components/PageTransition";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ForgotPassword = () => {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast.success("Check your email for the reset code.");
        setStep("reset");
      } else {
        toast.error("Failed to send code.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      if (res.ok) {
        toast.success("Password reset successfully!");
        navigate("/login");
      } else {
        const data = await res.json();
        toast.error(data.message || "Reset failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark px-6">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-light mb-8 text-textPrimary dark:text-textPrimary-dark">
            {step === "email" ? "Reset Password" : "Enter Reset Details"}
          </h1>

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border border-borderLight px-4 py-3 text-textPrimary"
              />
              <button
                disabled={loading}
                type="submit"
                className="w-full py-3 bg-textPrimary text-bgPrimary uppercase tracking-widest text-[10px]"
              >
                Send Code
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleResetPassword}
              className="flex flex-col gap-4"
            >
              <input
                type="text"
                placeholder="6-Digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full bg-transparent border border-borderLight px-4 py-3 text-textPrimary"
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-transparent border border-borderLight px-4 py-3 text-textPrimary"
              />
              <button
                disabled={loading}
                type="submit"
                className="w-full py-3 bg-textPrimary text-bgPrimary uppercase tracking-widest text-[10px]"
              >
                Reset Password
              </button>
            </form>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ForgotPassword;
