import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMe } from "../api";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");

      if (token) {
        localStorage.setItem("baithak_token", token);
        
        try {
          // Fetch user data to verify and update context
          const { data } = await getMe();
          setUser(data.user);
          navigate("/");
        } catch (err) {
          console.error("Auth callback error:", err);
          localStorage.removeItem("baithak_token");
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-400">Completing login...</p>
    </div>
  );
};

export default AuthCallback;
