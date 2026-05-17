import { createContext, useContext, useState, useEffect } from "react";
import { getMe, logoutUser } from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("baithak_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await getMe();
        setUser(data.user);
      } catch {
        localStorage.removeItem("baithak_token");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("baithak_token", token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {}
    localStorage.removeItem("baithak_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
