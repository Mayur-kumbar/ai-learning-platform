import axios from "axios";

// Create instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  timeout: 10000,
});

// 🔐 Attach token automatically
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🌐 Global response handling
api.interceptors.response.use(
  (response) => response,

  (error) => {
    // 🔴 Backend responded with error
    if (error.response) {
      const status = error.response.status;

      // 🔒 Unauthorized → trigger logout event instead of hard redirect
      if (status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Dispatch global event (better than forced redirect)
        window.dispatchEvent(new Event("auth:logout"));
      }

      // Normalize backend error message
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        "Something went wrong";

      return Promise.reject(new Error(message));
    }

    // ⏱ Timeout
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timeout. Try again."));
    }

    // 🌐 Network failure
    return Promise.reject(
      new Error("Network error. Please check your connection.")
    );
  }
);

export default api;