"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const router = useRouter(); // ✅ router

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

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Explore Courses</h1>

        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:border-yellow-400"
        />
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-3 gap-6">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div
              key={course._id}
              className="p-5 bg-white/10 rounded-2xl cursor-pointer hover:scale-105 transition"
              onClick={() => router.push(`/courses/${course._id}`)} // ✅ redirect on card click
            >
              <h2 className="text-xl font-semibold">{course.title}</h2>

              <p className="text-sm text-gray-400 mt-1">
                {course.description || "No description available"} 
              </p>
              {/* <p className="text-sm text-gray-400 mt-1">
                {course.lectures} lectures
              </p> */}

              <button
                onClick={(e) => {
                  e.stopPropagation(); // ❗ prevent card click
                  router.push(`/courses/${course._id}`);
                }}
                className="mt-4 w-full bg-yellow-400 text-black py-2 rounded-xl font-semibold"
              >
                View Course
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No courses found</p>
        )}
      </div>
    </div>
  );
}