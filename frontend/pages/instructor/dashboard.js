import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import FileUpload from "../../components/FileUpload";
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
  const { user } = useAuth();
  const router = useRouter();

  const skillData = [
    { subject: "AI", A: 80 },
    { subject: "ML", A: 70 },
    { subject: "NLP", A: 60 },
    { subject: "CV", A: 75 },
    { subject: "Data", A: 65 },
  ];

  console.log("User data in dashboard:", user); // Debugging line

  useEffect(() => {
    if (user?.role !== "instructor") {
      router.push("/dashboard"); // Redirect to main dashboard if not instructor
      return null; // or a loading spinner
    }
  }, [user, router]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gradient-to-br from-[#020617] via-black to-black text-white">
        {/* SIDEBAR */}
        <div className="w-64 p-6 border-r border-white/10 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-yellow-400 mb-10">
            LearnX AI
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

            <SidebarItem
              icon={<Bot />}
              text="AI Tutor"
              onClick={() => alert("AI Tutor coming")}
            />

            <SidebarItem
              icon={<BarChart />}
              text="Analytics"
              onClick={() => alert("Analytics coming")}
            />

            <SidebarItem
              icon={<Settings />}
              text="Settings"
              onClick={() => alert("Settings coming")}
            />
          </nav>
        </div>

        {/* MAIN */}
        <div className="flex-1 p-8 space-y-6">
          {/* HERO */}
          <motion.div className="p-6 rounded-2xl bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border border-white/10 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">
                Welcome {user?.name || "Instructor"}, 👋
              </h2>
              <p className="text-white/70 mt-2">
                Manage your courses and track performance.
              </p>
            </div>
            <div className="text-5xl">🎓</div>
          </motion.div>


          {/* QUICK ACTIONS */}
          <div className="grid md:grid-cols-3 gap-6">
            <GlassCard title="Quick Actions">
              <button
                onClick={() => router.push("/instructor/courses")}
                className="w-full bg-yellow-400 text-black py-2 rounded-lg font-semibold hover:scale-105 transition"
              >
                Go to Courses
              </button>
            </GlassCard>

            {/* ANALYTICS */}
            <GlassCard title="Course Analytics">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={skillData}>
                  <PolarGrid stroke="#ffffff20" />
                  <PolarAngleAxis dataKey="subject" stroke="#ccc" />
                  <Radar
                    dataKey="A"
                    stroke="#facc15"
                    fill="#facc15"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* EVENTS */}
            <GlassCard title="Upcoming Events">
              <p className="text-yellow-400">LIVE Webinar</p>
              <p className="mt-2">Instructor session</p>

              <button className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black py-2 rounded-xl font-semibold hover:scale-105 transition">
                Host Now
              </button>
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
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
        active
          ? "bg-gradient-to-r from-yellow-400/20 to-amber-500/20"
          : "hover:bg-white/10"
      }`}
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
      className="p-5 rounded-2xl bg-white/5 border border-white/10"
    >
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}
