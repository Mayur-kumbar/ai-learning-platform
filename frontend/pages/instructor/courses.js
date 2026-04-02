import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Home, Book, Bot, BarChart, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
        // 🔗 BACKEND: replace with real API
        // const res = await fetch("/api/courses");
        // const data = await res.json();
        // setCourses(data);

        // ✅ TEMP DATA (remove when backend ready)
        setCourses([
          {
            _id: "1",
            title: "AI Mastery",
            description: "Learn AI from basics",
            lectures: [],
          },
        ]);
      } catch (err) {
        console.error("Error fetching courses", err);
      }
    };

    fetchCourses();
  }, []);

  // 🚀 CREATE COURSE
  const handleCreateCourse = async () => {
    if (!newCourse.trim()) return;

    const newEntry = {
      title: newCourse,
      description: courseDesc,
    };

    try {
      // 🔗 BACKEND: create course
      // await fetch("/api/courses", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(newEntry),
      // });

      // ✅ TEMP UI UPDATE
      setCourses([
        ...courses,
        {
          _id: Date.now().toString(),
          ...newEntry,
          lectures: [],
        },
      ]);

      setNewCourse("");
      setCourseDesc("");
    } catch (err) {
      console.error("Create course failed", err);
    }
  };

  // 🚀 ADD LECTURE
  const handleAddLecture = async (courseId) => {
    if (!lectureTitle.trim() || !courseId) return;

    const newLecture = {
      title: lectureTitle,
      fileUrl: "temp-video-url.mp4",
    };

    try {
      // 🔗 BACKEND: add lecture
      // await fetch(`/api/courses/${courseId}/lectures`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(newLecture),
      // });

      // ✅ TEMP UI UPDATE
      setCourses(
        courses.map((c) =>
          c._id === courseId
            ? {
                ...c,
                lectures: [
                  ...c.lectures,
                  {
                    _id: Date.now().toString(),
                    ...newLecture,
                  },
                ],
              }
            : c
        )
      );

      setLectureTitle("");
      setActiveCourse(null);
    } catch (err) {
      console.error("Add lecture failed", err);
    }
  };

  // 🚀 DELETE COURSE
  const handleDeleteCourse = async (id) => {
    try {
      // 🔗 BACKEND: delete course
      // await fetch(`/api/courses/${id}`, { method: "DELETE" });

      setCourses(courses.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Delete course failed", err);
    }
  };

  // 🚀 DELETE LECTURE
  const handleDeleteLecture = async (courseId, lecId) => {
    try {
      // 🔗 BACKEND: delete lecture
      // await fetch(`/api/lectures/${lecId}`, { method: "DELETE" });

      setCourses(
        courses.map((c) =>
          c._id === courseId
            ? {
                ...c,
                lectures: c.lectures.filter((l) => l._id !== lecId),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Delete lecture failed", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#020617] via-black to-black text-white">

      {/* SIDEBAR */}
      <div className="w-64 p-6 border-r border-white/10">
        <h1 className="text-2xl font-bold text-yellow-400 mb-10">
          LearnX AI
        </h1>

        <SidebarItem icon={<Home />} text="Dashboard" onClick={() => router.push("/instructor/dashboard")} />
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

        {/* SELECT COURSE */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full p-3 rounded bg-black border border-white/20"
          >
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* COURSES */}
        <div className="space-y-4">
          {courses.map((course) => (
            <motion.div key={course._id} className="p-5 rounded-2xl bg-white/5 border border-white/10">

              <div
                className="flex justify-between cursor-pointer"
                onClick={() =>
                  setOpenCourse(openCourse === course._id ? null : course._id)
                }
              >
                <div>
                  <h2>{course.title}</h2>
                  <p className="text-sm text-gray-400">{course.description}</p>
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

              {openCourse === course._id && (
                <div className="mt-3">

                  {course.lectures.map((lec) => (
                    <div key={lec._id} className="flex justify-between">
                      {lec.title}
                      <button onClick={() => handleDeleteLecture(course._id, lec._id)}>✕</button>
                    </div>
                  ))}

                  <button onClick={() => setActiveCourse(course._id)}>
                    + Add Lecture
                  </button>

                  {activeCourse === course._id && (
                    <div>
                      <input
                        value={lectureTitle}
                        onChange={(e) => setLectureTitle(e.target.value)}
                      />
                      <button onClick={() => handleAddLecture(selectedCourse || course._id)}>
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, text, active, onClick }) {
  return (
    <div onClick={onClick} className="flex gap-3 p-3 cursor-pointer">
      {icon} {text}
    </div>
  );
}