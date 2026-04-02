import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import { Home, Book, Bot, BarChart, Settings } from "lucide-react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

export default function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
        // ✅ ONLY ENROLLED COURSES
        setCourses([
            {
            _id: "1",
            title: "AI Mastery",
            lectures: 10,
            },
        ]);
    }, []);

  const skillData = [
    { subject: "AI", A: 80 },
    { subject: "ML", A: 70 },
    { subject: "NLP", A: 60 },
    { subject: "CV", A: 75 },
    { subject: "Data", A: 65 },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#020617] via-black to-black text-white">

      {/* SIDEBAR */}
      <div className="w-64 p-6 border-r border-white/10 backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-yellow-400 mb-10">
          LearnX AI
        </h1>

        <nav className="space-y-4">
          <SidebarItem icon={<Home />} text="Dashboard" active />
          <SidebarItem 
                icon={<Book />} 
                text="Courses" 
                onClick={() => router.push("/courses")}
          />
          <SidebarItem icon={<Bot />} text="AI Tutor" />
          <SidebarItem icon={<BarChart />} text="Progress" />
          <SidebarItem icon={<Settings />} text="Settings" />
        </nav>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-8 space-y-6">

        {/* HERO */}
        <motion.div
          className="p-6 rounded-2xl bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border border-white/10 flex justify-between items-center"
        >
          <div>
            <h2 className="text-3xl font-bold">
              Welcome {user?.name || "Student"}, 👋
            </h2>
            <p className="text-white/70 mt-2">
              Continue your learning journey.
            </p>
          </div>

          <div className="text-5xl">📚</div>
        </motion.div>

        {/* GRID */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* ✅ COURSES (UPDATED) */}
          <GlassCard title="Enrolled Courses">
            {courses.map((course) => (
              <div
                key={course._id}
                onClick={() => router.push(`/courses/${course._id}`)}
                className="mb-4 cursor-pointer hover:bg-white/10 p-3 rounded"
              >
                <h3 className="font-semibold">{course.title}</h3>
                <p className="text-sm text-gray-400">
                  {course.lectures} lectures
                </p>
              </div>
            ))}
          </GlassCard>

          {/* AI Tutor */}
          <GlassCard title="AI Tutor">
            <HoverItem text="Ask doubts about ML" />
            <HoverItem text="Revise NLP concepts" />
          </GlassCard>

          {/* SKILL */}
          <GlassCard title="Your Progress">
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

        </div>
      </div>
    </div>
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
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <h3 className="mb-4">{title}</h3>
      {children}
    </div>
  );
}

function HoverItem({ text }) {
  return (
    <div className="p-2 hover:bg-white/10 rounded cursor-pointer flex justify-between">
      {text} <span>→</span>
    </div>
  );
}