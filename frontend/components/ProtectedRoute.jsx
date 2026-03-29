import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !isAuthenticated) {
      router.push("/login");
    } else {
      setIsReady(true);
    }
  }, [isAuthenticated, router]);

  if (!isReady) return null;

  return children;
}
