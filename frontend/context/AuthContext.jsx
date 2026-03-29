import { createContext, useState, useContext, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // persist login (optional but useful)
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
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
    <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);