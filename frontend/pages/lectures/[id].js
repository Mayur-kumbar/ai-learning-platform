import { useRouter } from "next/router";
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

  // 🎥 VIDEO.JS SETUP + QUIZ TRIGGER
  useEffect(() => {
    if (!lecture || playerRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      responsive: true,
      fluid: true,
      sources: [
        {
          src: lecture.fileUrl,
          type: "video/mp4",
        },
      ],
    });

    // 🎯 QUIZ TRIGGER WHEN VIDEO ENDS
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

  // 📡 MOCK DATA (REPLACE WITH API LATER)
  useEffect(() => {
    if (!id) return;

    setLecture({
      title: "AI Lecture",
      fileUrl: "https://www.w3schools.com/html/mov_bbb.mp4", 
      transcript: "This is the transcript of the lecture...",
      summary: [
        "AI is transforming education",
        "Machine learning is a subset of AI",
        "Neural networks mimic human brain",
      ],
      topics: ["AI", "ML", "Neural Networks"],
    });
  }, [id]);

  if (!lecture)
    return <p className="p-6 text-white">Loading...</p>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 grid md:grid-cols-2 gap-6">

      {/* 🎥 VIDEO SECTION */}
      <div>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered rounded-xl"
          playsInline
        />

        {/* SUMMARY TOGGLE */}
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="mt-4 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition"
        >
          Toggle Summary
        </button>

        {/* SUMMARY */}
        {showSummary && (
          <ul className="mt-3 list-disc ml-5 text-white/80">
            {lecture.summary.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        )}

        {/* TOPICS */}
        <div className="mt-4">
          {lecture.topics.map((topic, i) => (
            <span
              key={i}
              className="inline-block bg-cyan-400/20 text-cyan-300 px-3 py-1 rounded-full text-sm mr-2 mb-2"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* 🎯 QUIZ SECTION */}
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
        <p className="text-white/80">{lecture.transcript}</p>
      </div>
    </div>
  );
}