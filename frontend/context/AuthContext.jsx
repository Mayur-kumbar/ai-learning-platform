import { createContext, useState, useContext, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const onExpired = () => { setUser(null); setToken(null); };
    window.addEventListener("auth:logout", onExpired);
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    queueMicrotask(() => {
      if (storedToken && storedUser) {
        try { setUser(JSON.parse(storedUser)); setToken(storedToken); }
        catch { localStorage.removeItem("user"); localStorage.removeItem("token"); }
      }
      setReady(true);
    });
    return () => window.removeEventListener("auth:logout", onExpired);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { user: userData, token: tokenData } = res.data;
    
    setUser(userData);
    setToken(tokenData);

    localStorage.setItem("token", tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    const { user: userData, token: tokenData } = res.data;

    setUser(userData);
    setToken(tokenData);

    localStorage.setItem("token", tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
    return res.data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ ready, user, token, login, register, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);