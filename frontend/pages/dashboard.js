import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import { Home, Book, Bot, BarChart, Settings } from "lucide-react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [lectures, setLectures] = useState([]);
  const { user } = useAuth();
  console.log("User in Dashboard:", user);
  const role = "instructor" ; // Placeholder role logic
  const router = useRouter();

  useEffect(() => {
    setLectures([
      { _id: "1", title: "Python Fundamentals", status: "done" },
      { _id: "2", title: "Data Science with AI", status: "processing" },
      { _id: "3", title: "Deep Learning", status: "pending" },
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
          <SidebarItem icon={<Book />} text="Courses" />
          <SidebarItem icon={<Bot />} text="AI Tutor" />
          <SidebarItem icon={<BarChart />} text="Analytics" />
          <SidebarItem icon={<Settings />} text="Settings" />
        </nav>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-8 space-y-6">

        {/* PROFILE */}
        <div className="flex justify-end">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-sm">
              A
            </div>
          </div>
        </div>

        {/* HERO */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border border-white/10 backdrop-blur-xl flex justify-between items-center"
        >
          <div>
            <h2 className="text-3xl font-bold">
              Welcome {user?.name || "User"}, 👋
            </h2>
            <p className="text-white/70 mt-2">
              Let’s continue your learning journey.
            </p>

            <div className="w-64 mt-4">
              <p className="text-sm mb-2 text-white/70">
                Overall Progress: 68%
              </p>
              <div className="w-full h-3 bg-white/10 rounded-full">
                <div className="h-3 w-[68%] bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* ROBOT */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-5xl"
          >
            🤖
          </motion.div>
        </motion.div>

        {role === "instructor" && (
          <div className="mb-4">
            <FileUpload />
          </div>
        )}

        {/* GRID */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* CURRENT COURSES */}
          <GlassCard title="Current Lectures">
            {lectures.map((lecture) => (
              <div
                key={lecture._id}
                onClick={() => router.push(`/lectures/${lecture._id}`)}
                className="mb-4 flex justify-between items-center cursor-pointer hover:bg-white/10 p-2 rounded transition"
              >
                <p>{lecture.title}</p>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    lecture.status === "done"
                      ? "bg-green-500/20 text-green-400"
                      : lecture.status === "processing"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {lecture.status}
                </span>
              </div>
            ))}
          </GlassCard>

          {/* AI RECOMMENDATIONS */}
          <GlassCard title="AI Tutor Recommendations">
            <HoverItem text="Machine Learning Basics" />
            <HoverItem text="Natural Language Processing" />
          </GlassCard>

          {/* OVERALL PROGRESS */}
          <GlassCard title="Overall Progress">
            <p className="text-yellow-400 font-semibold">LIVE Webinar</p>
            <p className="mt-2">Live webinar invite</p>
            <p className="text-sm text-white/50 mt-1">
              June 4, 3:32 PM
            </p>
          </GlassCard>

          {/* EVENTS */}
          <GlassCard title="Upcoming Events">
            <p className="text-yellow-400">LIVE Webinar</p>
            <p className="mt-2">Live webinar or something</p>

            <button className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black py-2 rounded-xl font-semibold hover:scale-105 transition">
              Sign Up
            </button>
          </GlassCard>

          {/* SKILL CHART */}
          <GlassCard title="Skill Proficiency">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={skillData}>
                <PolarGrid stroke="#ffffff20" />
                <PolarAngleAxis dataKey="subject" stroke="#ccc" />
                <Radar
                  name="Skill"
                  dataKey="A"
                  stroke="#facc15"
                  fill="#facc15"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* GOALS */}
          <GlassCard title="Daily Goals">
            <p className="text-white/70">3/5 goals completed</p>

            <div className="flex gap-4 mt-4">
              <Circle progress={20} />
              <Circle progress={60} />
              <Circle progress={80} />
            </div>
          </GlassCard>

        </div>
      </div>
    </div>
  );
}

/* COMPONENTS */

function SidebarItem({ icon, text, active }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
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
      className="relative p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition duration-500 bg-gradient-to-r from-yellow-400/10 to-amber-500/10 blur-xl"></div>

      <h3 className="font-semibold mb-4 relative z-10">{title}</h3>
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

function HoverItem({ text }) {
  return (
    <div className="p-3 rounded-xl hover:bg-white/10 cursor-pointer transition flex justify-between">
      {text}
      <span>→</span>
    </div>
  );
}

function Circle({ progress }) {
  return (
    <div className="w-16 h-16 rounded-full border-4 border-yellow-400 flex items-center justify-center">
      {progress}%
    </div>
  );
}