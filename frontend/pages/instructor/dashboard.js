import Brand from "@/components/Brand";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import LearningOverview from "@/components/LearningOverview";
import { Home, Book, Bot, BarChart, Settings } from "lucide-react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "instructor") {
      router.push("/dashboard"); // Redirect to main dashboard if not instructor
      return null; // or a loading spinner
    }
  }, [user, router]);

  return (
    <ProtectedRoute>
      <div className="workspace-shell">
        {/* SIDEBAR */}
        <div className="workspace-nav">
          <h1 className="workspace-wordmark">
            <Brand />
          </h1>

          <nav className="space-y-4">
            <SidebarItem
              icon={<Home />}
              text="Dashboard"
              active
              onClick={() => router.push("/instructor/dashboard")}
            />

            {/* ✅ FIXED HERE */}
            <SidebarItem
              icon={<Book />}
              text="Courses"
              onClick={() => router.push("/instructor/courses")}
            />

            <SidebarItem icon={<Settings />} text="Sign out" onClick={() => { logout(); router.push("/login"); }} />
          </nav>
        </div>

        {/* MAIN */}
        <div className="workspace-main space-y-6">
          {/* HERO */}
          <motion.div className="welcome-banner">
            <div>
              <h2 className="text-3xl font-bold">
                Welcome, {user?.name || "Instructor"}
              </h2>
              <p className="text-slate-300 mt-2">
                Manage your courses and track performance.
              </p>
            </div>
            <div className="welcome-art" aria-hidden="true" />
          </motion.div>


          {/* QUICK ACTIONS */}
          <div className="workspace-grid">
            <GlassCard title="Quick Actions">
              <button
                onClick={() => router.push("/instructor/courses")}
                className="w-full bg-blue-700 text-white py-2 rounded-lg font-semibold hover:-translate-y-0.5 transition"
              >
                Go to Courses
              </button>
            </GlassCard>

            {/* ANALYTICS */}
            <GlassCard title="Course Analytics">
              <LearningOverview user={user} instructor />
            </GlassCard>


          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* COMPONENTS */

function SidebarItem({ icon, text, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`workspace-nav-item ${active ? "is-active" : ""}`}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}

function GlassCard({ title, children }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className="surface-card"
    >
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}
