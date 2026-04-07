import api from "@/lib/api";
import { useState } from "react";

export default function FileUpload({ courseId, title, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    if (!courseId) {
      alert("No course selected. Please select a course first.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title || "Untitled Lecture");
    formData.append("file", file);
    console.log("Uploading file for course:", courseId);
    console.log("File details:", file.name, file.size, file.type);

    try {
      setUploading(true);

      console.log(formData)
      // Upload lecture tied to the specific course via courseId
      const res = await api.post(`/courses/${courseId}/lectures/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / event.total);
          setProgress(percent);
        },
      });

      const lectureId = res.data.id;

      // 🔁 POLLING — check processing status
      // const interval = setInterval(async () => {
      //   const statusRes = await api.get(`/courses/${courseId}/lectures/${lectureId}`);

      //   if (statusRes.data.status === "done") {
      //     clearInterval(interval);
      //     alert("Processing complete 🎉");
      //     setUploading(false);
      //     setProgress(0);
      //     setFile(null);

      //     // Notify parent component so it can refresh lectures list
            onUploadComplete(lectureId);
          
      //   }
      // }, 5000);
      setFile(null);
      setProgress(0);
      setUploading(false);
      alert("Upload successful! Processing has started. This may take a few minutes.");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl">
      {/* Course context indicator */}
      {courseId ? (
        <p className="text-xs text-green-400 mb-2">
          📁 Uploading to course: <span className="font-mono">{courseId}</span>
        </p>
      ) : (
        <p className="text-xs text-red-400 mb-2">⚠️ No course selected</p>
      )}

      <input
        type="file"
        // accept="video/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-3 text-sm text-white/70"
      />

      <button
        onClick={handleUpload}
        disabled={uploading || !courseId}
        className="bg-gradient-to-r from-cyan-400 to-green-400 text-black px-4 py-2 rounded-xl font-semibold hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {uploading ? "Uploading..." : "Upload Lecture"}
      </button>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="mt-4">
          <div className="w-full h-2 bg-white/10 rounded">
            <div
              className="h-2 bg-cyan-400 rounded transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-1 text-white/60">{progress}%</p>
        </div>
      )}
    </div>
  );
}