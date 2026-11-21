"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import FileUpload from "@/components/FileUpload";

function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function CourseDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [course, setCourse] = useState(null);
  const [lectureTitle, setLectureTitle] = useState("");
  
  const [lectureSource, setLectureSource] = useState("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState("");

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

  // 🚀 ADD YOUTUBE LECTURE
  const handleAddYouTubeLecture = async () => {
    if (!lectureTitle.trim()) return;
    setYoutubeError("");

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setYoutubeError("Invalid YouTube URL. Please provide a valid link.");
      return;
    }

    try {
      await api.post(`/courses/${id}/lectures/youtube`, {
        title: lectureTitle,
        youtubeUrl: youtubeUrl,
      });

      setLectureTitle("");
      setYoutubeUrl("");
      setYoutubeError("");

      // refresh
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
    } catch (err) {
      console.error("Failed to add YouTube lecture", err);
      setYoutubeError("Failed to add lecture. Please try again.");
    }
  };

  if (!course) return <p className="text-white p-6">Loading...</p>;

  const videoPreviewId = extractVideoId(youtubeUrl);

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
        <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Add New Lecture</h2>
          <input
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="Lecture title"
            className="w-full p-3 mb-4 rounded bg-white/10 border border-white/20 focus:outline-none focus:border-yellow-400"
          />

          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setLectureSource("upload")}
              className={`px-4 py-2 rounded transition-colors ${
                lectureSource === "upload"
                  ? "bg-yellow-400 text-black font-semibold"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setLectureSource("youtube")}
              className={`px-4 py-2 rounded transition-colors ${
                lectureSource === "youtube"
                  ? "bg-yellow-400 text-black font-semibold"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              YouTube URL
            </button>
          </div>

          {lectureSource === "upload" && (
            <FileUpload
              courseId={id}
              title={lectureTitle}
              onUploadComplete={async () => {
                const res = await api.get(`/courses/${id}`);
                setCourse(res.data);
                setLectureTitle("");
              }}
            />
          )}

          {lectureSource === "youtube" && (
            <div className="space-y-4">
              <input
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setYoutubeError("");
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full p-3 rounded bg-white/10 border border-white/20 focus:outline-none focus:border-yellow-400"
              />
              
              {youtubeError && (
                <p className="text-red-400 text-sm">{youtubeError}</p>
              )}

              {videoPreviewId && (
                <div className="relative w-full max-w-md aspect-video mt-2">
                  <iframe
                    className="absolute top-0 left-0 w-full h-full rounded"
                    src={`https://www.youtube.com/embed/${videoPreviewId}`}
                    title="YouTube video preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              <button
                onClick={handleAddYouTubeLecture}
                disabled={!lectureTitle.trim() || !youtubeUrl.trim()}
                className="mt-3 bg-yellow-400 text-black px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add YouTube Lecture
              </button>
            </div>
          )}
        </div>

        {/* 📚 LECTURES */}
        <div className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold mb-3">Course Lectures</h2>
          {course.lectures?.length === 0 && (
            <p className="text-white/50">No lectures yet.</p>
          )}
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