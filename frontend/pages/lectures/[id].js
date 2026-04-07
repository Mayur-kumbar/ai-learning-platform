"use client";

import { useRouter } from "next/router";
import api from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

export default function LecturePage() {
  const router = useRouter();
  const { id } = router.query;
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const [lecture, setLecture] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // ✅ FETCH LECTURE
  useEffect(() => {
    if (!id) return;

    const fetchLecture = async () => {
      try {
        const res = await api.get(`/lectures/${id}`);
        setLecture(res.data.lecture); // ✅ FIXED
      } catch (error) {
        console.error("Error fetching lecture", error);
      }
    };

    fetchLecture();
  }, [id]);

  // ✅ VIDEO.JS INIT (ONLY IF VIDEO)
  useEffect(() => {
    if (!lecture || lecture.fileType !== "video") return;
    if (playerRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      responsive: true,
      fluid: true,
      sources: [
        {
          src: `${BASE_URL}${lecture.fileUrl}`,
          type: "video/mp4",
        },
      ],
    });

    playerRef.current.on("ended", () => {
      setShowQuiz(true);
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [lecture]);

  // 🤖 AI HANDLER
  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    setTimeout(() => {
      setAnswer(
        `AI Answer: "${question}" is related to key concepts in this lecture. Review transcript and examples.`
      );
      setLoading(false);
    }, 1000);
  };

  if (!lecture) {
    return <p className="p-6 text-white">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 grid md:grid-cols-2 gap-6">

      {/* 🎥 / 📄 CONTENT SECTION */}
      <div>
        <h1 className="text-2xl font-bold mb-4">
          {lecture.title}
        </h1>

        {/* ✅ VIDEO */}
        {lecture.fileType === "video" && (
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered rounded-xl"
            playsInline
          />
        )}

        {/* ✅ PDF */}
        {lecture.fileType === "pdf" && (
          <iframe
            src={`${BASE_URL}${lecture.fileUrl}`}
            className="w-full h-[500px] rounded-xl"
          />
        )}

        {/* ✅ FALLBACK */}
        {!lecture.fileUrl && (
          <div className="p-4 bg-white/10 rounded-xl">
            <p>No media available. Read lecture below.</p>
          </div>
        )}

        {/* 🔘 SUMMARY TOGGLE */}
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="mt-4 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20"
        >
          Toggle Summary
        </button>

        {/* 📌 SUMMARY */}
        {showSummary && (
          <ul className="mt-3 list-disc ml-5 text-white/80">
            {lecture.summary?.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        )}

        {/* 🧠 TOPICS */}
        <div className="mt-4">
          {lecture.topics?.map((topic, i) => (
            <span
              key={i}
              className="inline-block bg-cyan-400/20 text-cyan-300 px-3 py-1 rounded-full text-sm mr-2 mb-2"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* 🎯 QUIZ */}
        {showQuiz && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <h3 className="font-bold text-green-400 mb-2">
              Quiz Time 🎯
            </h3>

            <p className="mb-2">What is AI?</p>

            <div className="space-y-2">
              <button className="block w-full text-left bg-white/10 p-2 rounded hover:bg-white/20">
                Artificial Intelligence
              </button>
              <button className="block w-full text-left bg-white/10 p-2 rounded hover:bg-white/20">
                Automated Input
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📜 TRANSCRIPT */}
      <div className="bg-white/5 p-4 rounded-xl h-[500px] overflow-y-scroll">
        <h2 className="font-semibold mb-2">Transcript</h2>
        <p className="text-white/80 whitespace-pre-line">
          {lecture.transcript}
        </p>
      </div>

      {/* 🤖 AI TUTOR */}
      <div className="md:col-span-2 mt-4 p-4 bg-white/10 rounded-xl">
        <h2 className="font-semibold mb-3">AI Tutor 🤖</h2>

        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          type="text"
          placeholder="Ask about this lecture..."
          className="w-full p-3 rounded bg-black border border-white/20"
        />

        <button
          onClick={handleAsk}
          disabled={!question || loading}
          className="mt-3 bg-yellow-400 text-black px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
        >
          Ask
        </button>

        {loading && (
          <p className="mt-3 text-yellow-400">Thinking...</p>
        )}

        {answer && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            {answer}
          </div>
        )}
      </div>
    </div>
  );
}