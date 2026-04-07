import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Home, Book, Bot, BarChart, Settings } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [activeCourse, setActiveCourse] = useState(null);
  const [lectureTitle, setLectureTitle] = useState("");
  const [openCourse, setOpenCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");

  const router = useRouter();

  // 🚀 FETCH COURSES
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get("/courses");
        setCourses(res.data);
      } catch (err) {
        console.error("Error fetching courses", err);
      }
    };
    fetchCourses();
  }, []);

  // 🚀 CREATE COURSE
  const handleCreateCourse = async () => {
    if (!newCourse.trim()) return;
    try {
      await api.post("/courses/create", {
        title: newCourse,
        description: courseDesc,
      });
      setNewCourse("");
      setCourseDesc("");
    } catch (err) {
      console.error("Create course failed", err);
    }
  };

  // 🚀 ADD LECTURE (title only — file is handled by FileUpload)
  const handleAddLecture = async (courseId) => {
    if (!lectureTitle.trim() || !courseId) return;
    try {
      setCourses(
        courses.map((c) =>
          c._id === courseId
            ? {
                ...c,
                lectures: [
                  ...c.lectures,
                  {
                    _id: Date.now().toString(),
                    title: lectureTitle,
                    fileUrl: "",
                  },
                ],
              }
            : c,
        ),
      );
      setLectureTitle("");
      setActiveCourse(null);
    } catch (err) {
      console.error("Add lecture failed", err);
    }
  };

  // Called when FileUpload finishes — refreshes lecture list for the course
  const handleUploadComplete = async (courseId) => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      setCourses((prev) =>
        prev.map((c) =>
          c._id === courseId ? { ...c, lectures: res.data.lectures } : c,
        ),
      );
    } catch (err) {
      console.error("Failed to refresh lectures after upload", err);
    }
  };

  // 🚀 DELETE COURSE
  const handleDeleteCourse = async (id) => {
    try {
      setCourses(courses.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Delete course failed", err);
    }
  };

  // 🚀 DELETE LECTURE
  const handleDeleteLecture = async (courseId, lecId) => {
    try {
      setCourses(
        courses.map((c) =>
          c._id === courseId
            ? { ...c, lectures: c.lectures.filter((l) => l._id !== lecId) }
            : c,
        ),
      );
    } catch (err) {
      console.error("Delete lecture failed", err);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gradient-to-br from-[#020617] via-black to-black text-white">
        {/* SIDEBAR */}
        <div className="w-64 p-6 border-r border-white/10">
          <h1 className="text-2xl font-bold text-yellow-400 mb-10">
            LearnX AI
          </h1>
          <SidebarItem
            icon={<Home />}
            text="Dashboard"
            onClick={() => router.push("/instructor/dashboard")}
          />
          <SidebarItem icon={<Book />} text="Courses" active />
          <SidebarItem icon={<Bot />} text="AI Tutor" />
          <SidebarItem icon={<BarChart />} text="Analytics" />
          <SidebarItem icon={<Settings />} text="Settings" />
        </div>

        {/* MAIN */}
        <div className="flex-1 p-10 space-y-8">
          {/* HEADER */}
          <div>
            <h1 className="text-3xl font-bold mb-2">Manage Courses</h1>
            <p className="text-white/60">Create and organize your content</p>
          </div>

          {/* CREATE COURSE */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <input
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              placeholder="Course title"
              className="w-full p-3 rounded bg-black border border-white/20"
            />
            <textarea
              value={courseDesc}
              onChange={(e) => setCourseDesc(e.target.value)}
              placeholder="Course description"
              className="w-full mt-3 p-3 rounded bg-black border border-white/20"
            />
            <button
              onClick={handleCreateCourse}
              className="mt-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-6 py-2 rounded-xl font-semibold hover:scale-105 transition"
            >
              Create Course
            </button>
          </div>

          {/* COURSES */}
          <div className="space-y-4">
            {console.log(courses)}
            {courses.map((course) => (
              <motion.div
                key={course._id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:scale-105 transition"
                onClick={() => router.push(`/instructor/courses/${course._id}`)}
              >
                <div className="flex justify-between">
                  <div>
                    <h2>{course.title}</h2>
                    <p className="text-sm text-gray-400">
                      {course.description}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse(course._id);
                    }}
                    className="text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function SidebarItem({ icon, text, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex gap-3 p-3 cursor-pointer ${active ? "text-yellow-400" : "text-white/60 hover:text-white"}`}
    >
      {icon} {text}
    </div>
  );
}
