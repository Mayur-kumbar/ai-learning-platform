import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // TEMP ROLE LOGIC (we will fix later)
    const role =
      user?.email === "your-email@gmail.com"
        ? "instructor"
        : "student";

    if (role === "instructor") {
      router.push("/instructor/dashboard");
    } else {
      router.push("/student/dashboard");
    }
  }, [user]);

  return (
    <div className="p-6 text-white">
      Redirecting to your dashboard...
    </div>
  );
}