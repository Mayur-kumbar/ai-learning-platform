"use client";

import Brand from "@/components/Brand";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReadingForm from '@/components/ReadingForm';
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

  const [courseError, setCourseError] = useState('');
  async function refreshCourse() {
    const response = await api.get(`/courses/${id}`);
    setCourse(response.data);
  }

  // 🚀 FETCH COURSE
  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data);
      } catch (err) {
        setCourseError(err.message);
      }
    };

    fetchCourse();
  }, [id]);

  const processing = course?.lectures?.some(item => item.status === "processing");
  useEffect(() => {
    if (!id || !processing) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      api.get(`/courses/${id}`, {signal: controller.signal})
        .then(({data}) => { if (!controller.signal.aborted) setCourse(data); })
        .catch(err => { if (!controller.signal.aborted) setCourseError(err.message); });
    }, 5000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [id, processing]);

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

  if (!course && courseError) return <p role="alert">{courseError}</p>;
  if (!course) return <p className="text-white p-6">Loading...</p>;

  const videoPreviewId = extractVideoId(youtubeUrl);

  return (
    <ProtectedRoute role="instructor">
      <div className="course-page">
      <header className="course-brand"><Brand /></header>

        <h1 className="text-3xl font-bold mb-4">
          {course.title}
        </h1>

        <p className="text-slate-300 mb-6">
          {course.description}
        </p>

        <div className="mb-6 flex items-center gap-4">
          <span>{course.published ? 'Published' : 'Draft'} · {course.enrollmentCount || 0} enrolled</span>
          {!course.published && <button disabled={!course.lectures?.length} className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50" onClick={async () => {
            try { await api.post(`/courses/${id}/publish`); await refreshCourse(); }
            catch (error) { setCourseError(error.message); }
          }}>Publish course</button>}
          <Link href="/instructor/dashboard" className="underline">Instructor dashboard</Link>
        </div>
        {courseError && <p role="alert">{courseError}</p>}
        {/* ➕ ADD LECTURE */}
        <div className="surface-card mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Lecture</h2>
          <input
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="Lecture title"
            className="w-full p-3 mb-4 rounded bg-slate-800 border border-slate-600 focus:outline-none focus:border-blue-400"
          />

          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setLectureSource("upload")}
              className={`px-4 py-2 rounded transition-colors ${
                lectureSource === "upload"
                  ? "bg-blue-700 text-white font-semibold"
                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setLectureSource("youtube")}
              className={`px-4 py-2 rounded transition-colors ${
                lectureSource === "youtube"
                  ? "bg-blue-700 text-white font-semibold"
                  : "bg-slate-800 text-slate-100 hover:bg-slate-700"
              }`}
            >
              YouTube URL
            </button>
          </div>

          <button className="mb-4 underline" onClick={() => setLectureSource("reading")}>Add an instructor-written reading and quiz</button>
          {lectureSource === "reading" && <ReadingForm courseId={id} title={lectureTitle} onCreated={async () => { await refreshCourse(); setLectureTitle(""); }} />}
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
                className="w-full p-3 rounded bg-slate-800 border border-slate-600 focus:outline-none focus:border-blue-400"
              />
              
              {youtubeError && (
                <p className="text-red-300 text-sm">{youtubeError}</p>
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
                className="mt-3 bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="text-slate-300">No lectures yet.</p>
          )}
          {course.lectures?.map((lec) => (
            <div
              key={lec._id}
              className="p-3 bg-slate-800 rounded"
            >
              <a className="underline" href={`/lectures/${lec._id}`}>{lec.title}</a> · {lec.status} · quiz {lec.quizStatus || "pending"}
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}