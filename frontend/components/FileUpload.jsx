import { useState } from "react";
import axios from "axios";

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const res = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (event) => {
          const percent = Math.round(
            (event.loaded * 100) / event.total
          );
          setProgress(percent);
        },
      });

      const lectureId = res.data.id;

      // 🔁 POLLING
      const interval = setInterval(async () => {
        const statusRes = await axios.get(
          `/api/lectures/${lectureId}`
        );

        if (statusRes.data.status === "done") {
          clearInterval(interval);
          alert("Processing complete 🎉");
          setUploading(false);
        }
      }, 5000);

    } catch (err) {
      console.error(err);
      alert("Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl">

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-3"
      />

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-gradient-to-r from-cyan-400 to-green-400 text-black px-4 py-2 rounded-xl font-semibold hover:scale-105 transition"
      >
        {uploading ? "Uploading..." : "Upload Lecture"}
      </button>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="mt-4">
          <div className="w-full h-2 bg-white/10 rounded">
            <div
              className="h-2 bg-cyan-400 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-1">{progress}%</p>
        </div>
      )}
    </div>
  );
}