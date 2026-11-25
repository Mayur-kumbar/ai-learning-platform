"use client";

import Brand from "@/components/Brand";

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
    <div className="course-page">
      <header className="course-brand"><Brand /></header>

      {/* HEADER */}
      <div className="course-page-heading">
        <h1 className="text-3xl font-bold">Explore Courses</h1>

        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-3 gap-6">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div
              key={course._id}
              className="course-tile"
              onClick={() => router.push(`/courses/${course._id}`)} // ✅ redirect on card click
            >
              <h2 className="text-xl font-semibold">{course.title}</h2>

              <p className="text-sm text-slate-300 mt-1">
                {course.description || "No description available"} 
              </p>
              {/* <p className="text-sm text-slate-300 mt-1">
                {course.lectures} lectures
              </p> */}

              <button
                onClick={(e) => {
                  e.stopPropagation(); // ❗ prevent card click
                  router.push(`/courses/${course._id}`);
                }}
                className="mt-4 w-full bg-blue-700 text-white py-2 rounded-xl font-semibold"
              >
                View Course
              </button>
            </div>
          ))
        ) : (
          <p className="text-slate-300">No courses found</p>
        )}
      </div>
    </div>
  );
}