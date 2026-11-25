import Brand from "@/components/Brand";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import { Home, Book, Bot, BarChart, Settings } from "lucide-react";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import LearningOverview from "@/components/LearningOverview";
import api from "@/lib/api";

export default function StudentDashboard() {
  const [engagementSessions, setEngagementSessions] = useState([]);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;
    api.get("/analytics/engagement/sessions")
      .then((response) => setEngagementSessions(response.data.sessions || []))
      .catch(() => setEngagementSessions([]));
  }, [user?.id]);

  return (
    <ProtectedRoute>
      <div className="workspace-shell">
        {/* SIDEBAR */}
        <div className="workspace-nav">
          <h1 className="workspace-wordmark">
            <Brand />
          </h1>

          <nav className="space-y-4">
            <SidebarItem icon={<Home />} text="Dashboard" active />
            <SidebarItem
              icon={<Book />}
              text="Courses"
              onClick={() => router.push("/courses")}
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
                Welcome, {user?.name || "Student"}
              </h2>
              <p className="text-slate-300 mt-2">
                Continue your learning journey.
              </p>
            </div>

            <div className="welcome-art" aria-hidden="true" />
          </motion.div>

          {/* GRID */}
          <div className="workspace-grid">
            {/* ✅ COURSES (UPDATED) */}
            <GlassCard title="My learning"><LearningOverview user={user}/></GlassCard>

            {/* SKILL */}
            <GlassCard title="Your Progress">
              <p className="mb-3 text-xs text-slate-300">Session observations are estimates and do not measure learning.</p>
              {engagementSessions.length === 0 ? <p className="text-sm text-slate-300">No opted-in session summaries yet.</p> : (
                <div className="space-y-3">
                  {engagementSessions.slice(0, 5).map((session) => (
                    <div key={`${session.sessionId}-${session._id}`} className="rounded-lg bg-slate-800 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm">{session.lectureId?.title || "Lecture"}</span>
                        <span className="text-xs text-blue-300">{session.trackingMode === "camera" ? "Camera assisted" : session.trackingMode === "behavioral" ? "Playback only" : "Historical log"}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        {Math.round(((session.watchedDurationSec ?? session.sessionDurationSec) || 0) / 60)} min observed · {Math.round((session.tabFocusRatio || 0) * 100)}% tab visible
                        {session.averageScore != null ? ` · ${Math.round(session.averageScore * 100)}% estimate` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
    <div className="surface-card">
      <h3 className="mb-4">{title}</h3>
      {children}
    </div>
  );
}

function HoverItem({ text }) {
  return (
    <div className="p-2 hover:bg-slate-800 rounded cursor-pointer flex justify-between">
      {text} <span>→</span>
    </div>
  );
}
