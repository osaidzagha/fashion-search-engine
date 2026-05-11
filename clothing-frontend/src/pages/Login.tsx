import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/api";
import { setCredentials } from "../store/authSlice";
import toast from "react-hot-toast"; // 👈 IMPORT ADDED
import PageTransition from "../components/PageTransition";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 👈 We wrap the API call in a Promise to feed it to toast.promise
    const loginPromise = loginUser({ email, password }).then((response) => {
      const { token, ...userData } = response;
      dispatch(setCredentials({ user: userData, token }));
      navigate("/");
    });

    // 🍞 THE TOAST
    toast
      .promise(loginPromise, {
        loading: "Authenticating...",
        success: "Welcome back to Dope.",
        error: (err: any) => err.message || "Invalid credentials.",
      })
      .finally(() => {
        setLoading(false);
      });
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border border-borderLight dark:border-borderLight-dark px-4 py-3 text-textPrimary dark:text-textPrimary-dark font-sans text-sm focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 font-sans text-[10px] tracking-widest uppercase bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark border-none cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-200"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Footer link */}
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
