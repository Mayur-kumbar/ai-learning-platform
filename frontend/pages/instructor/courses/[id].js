"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import FileUpload from "@/components/FileUpload";

export default function CourseDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [course, setCourse] = useState(null);
  const [lectureTitle, setLectureTitle] = useState("");

  // 🚀 FETCH COURSE
  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data);
      } catch (err) {
        console.error("Error fetching course", err);
      }
    };

    fetchCourse();
  }, [id]);

  // 🚀 ADD LECTURE
  const handleAddLecture = async () => {
    if (!lectureTitle.trim()) return;

    try {
      await api.post(`/lectures/create`, {
        courseId: id,
        title: lectureTitle,
      });

      setLectureTitle("");

      // refresh
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
    } catch (err) {
      console.error("Failed to add lecture", err);
    }
  };

  if (!course) return <p className="text-white p-6">Loading...</p>;

  return (
    <ProtectedRoute role="instructor">
      <div className="min-h-screen bg-black text-white p-8">

        <h1 className="text-3xl font-bold mb-4">
          {course.title}
        </h1>

        <p className="text-gray-400 mb-6">
          {course.description}
        </p>

        {/* ➕ ADD LECTURE */}
        <div className="mb-6">
          <input
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="Lecture title"
            className="w-full p-3 rounded bg-white/10 border border-white/20"
          />

          <button
            onClick={handleAddLecture}
            className="mt-3 bg-yellow-400 text-black px-6 py-2 rounded"
          >
            Add Lecture
          </button>
        </div>

        {/* 📤 FILE UPLOAD */}
        <FileUpload
          courseId={id}
          title={lectureTitle}
          onUploadComplete={async () => {
            const res = await api.get(`/courses/${id}`);
            setCourse(res.data);
          }}
        />

        {/* 📚 LECTURES */}
        <div className="mt-6 space-y-3">
          {course.lectures?.map((lec) => (
            <div
              key={lec._id}
              className="p-3 bg-white/10 rounded"
            >
              {lec.title}
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}