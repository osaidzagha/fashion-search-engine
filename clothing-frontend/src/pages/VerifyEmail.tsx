import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/authSlice";
import { Spinner } from "../components/Spinner";
import PageTransition from "../components/PageTransition";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState(false);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/auth/verify/${token}`,
        );

        const {
          token: accessToken,
          message: serverMessage,
          ...userData
        } = response.data;

        dispatch(setCredentials({ user: userData, token: accessToken }));
        setMessage("Account Activated. Welcome to the club.");

        setTimeout(() => {
          navigate("/");
        }, 2000);
      } catch (err) {
        setError(true);
        if (axios.isAxiosError(err)) {
          setMessage(err.response?.data?.message || "Verification failed.");
        } else {
          setMessage("An unexpected network error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) verifyUser();
  }, [token, navigate]);

  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark px-6 text-center">
        {/* Spinner while verifying */}
        {loading && (
          <div className="mb-8">
            <Spinner />
          </div>
        )}

        {/* Overline */}
        {!loading && (
          <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark mb-6">
            {error ? "Verification failed" : "Email verified"}
          </p>
        )}

        {/* Message heading */}
        <h1
          className={[
            "font-heading font-light text-4xl md:text-5xl tracking-[-0.02em] leading-none",
            loading
              ? "text-textMuted dark:text-textMuted-dark"
              : error
                ? "text-accentRed"
                : "text-textPrimary dark:text-textPrimary-dark",
          ].join(" ")}
        >
          {message}
        </h1>

        {/* Redirect hint on success */}
        {!loading && !error && (
          <p className="mt-6 font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
            Redirecting you now…
          </p>
        )}

        {/* Retry hint on error */}
        {!loading && error && (
          <p className="mt-6 font-sans text-[10px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
            The link may have expired.{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-textPrimary dark:text-textPrimary-dark underline underline-offset-4 decoration-borderLight hover:decoration-textPrimary dark:hover:decoration-textPrimary-dark transition-colors duration-200 bg-transparent border-none cursor-pointer font-sans text-[10px] tracking-widest uppercase"
            >
              Return to Login
            </button>
          </p>
        )}
      </div>
    </PageTransition>
  );
};

export default VerifyEmail;
