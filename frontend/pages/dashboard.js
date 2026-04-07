import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("User role:", user.role); // Debugging line
    const role = user.role || "student"; // Default to student if role is missing

    if (role === "instructor") {
      router.push("/instructor/dashboard");
    } else {
      router.push("/student/dashboard");
    }
  }, [user, router]);

  return (
    <ProtectedRoute>
      <div className="p-6 text-white">Redirecting to your dashboard...</div>
    </ProtectedRoute>
  );
}
