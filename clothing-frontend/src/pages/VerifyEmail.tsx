import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import axios or your custom API fetcher here
import axios from "axios";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/authSlice";

const VerifyEmail = () => {
  // 1. The 'useParams' hook is the secret weapon. It grabs the ':token' from the URL!
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // 2. We need state to track what is happening
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState(false);

  // 3. The useEffect hook runs exactly ONCE when the page first opens
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/auth/verify/${token}`,
        );

        // 🛡️ The Session Capture
        // We extract the user data and the token from the backend response
        const {
          token: accessToken,
          message: serverMessage,
          ...userData
        } = response.data;

        // 🧠 Tell Redux: "We are officially logged in!"
        dispatch(
          setCredentials({
            user: userData,
            token: accessToken,
          }),
        );

        setMessage("Account Activated! Welcome to the club.");

        // 🏎️ The Luxury Exit: Redirect to Home instead of Login
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } catch (err) {
        setError(true);

        // 👇 Prove to TypeScript that this is an Axios error
        if (axios.isAxiosError(err)) {
          // Now TS is happy, and we can use "Optional Chaining" (?.) to safely grab the message!
          setMessage(err.response?.data?.message || "Verification failed.");
        } else {
          // If it's a random network failure or typo, it falls back here
          setMessage("An unexpected network error occurred.");
        }
      } finally {
        // Turn off the loading spinner when the request finishes
        setLoading(false);
      }
    };

    // Only run the function if a token actually exists in the URL
    if (token) {
      verifyUser();
    }
  }, [token, navigate]);

  // 4. The UI (Keep it clean and luxury for your fashion brand)
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {loading && <div>Loading Spinner Here...</div>}

      {/* If error is true, make text red. If false, make it green! */}
      <h1 className={error ? "text-red-500" : "text-green-500"}>{message}</h1>
    </div>
  );
};

export default VerifyEmail;
