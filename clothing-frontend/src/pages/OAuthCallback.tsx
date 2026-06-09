import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/authSlice";
import toast from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { Spinner } from "../components/Spinner";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

/**
 * Landing page for Google OAuth callback.
 *
 * Your backend should redirect here after a successful Google auth:
 *   GET /api/auth/google/callback  →  302 to  /oauth/callback?token=<jwt>
 *
 * This page reads ?token= from the URL, fetches the user profile,
 * stores credentials in Redux, then navigates home.
 */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const ran = useRef(false); // guard against React 18 double-effect

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error || !token) {
      toast.error(
        error === "account_exists"
          ? "An account with this email already exists. Sign in with your password."
          : "Google sign-in failed. Please try again.",
      );
      navigate("/login", { replace: true });
      return;
    }

    // Fetch the user profile with the token
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load profile.");

        const user = await res.json();
        dispatch(setCredentials({ user, token }));
        toast.success("Welcome to Dope.");
        navigate("/", { replace: true });
      } catch {
        toast.error("Could not complete sign-in. Please try again.");
        navigate("/login", { replace: true });
      }
    };

    fetchProfile();
  }, []);

  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark px-6 text-center gap-6">
        <Spinner />
        <p className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark">
          Completing sign-in…
        </p>
      </div>
    </PageTransition>
  );
}
