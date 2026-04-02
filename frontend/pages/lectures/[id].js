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
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  // 🎥 VIDEO.JS SETUP
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

  // 🔥 CONNECTED COURSE + LECTURE STRUCTURE
  useEffect(() => {
    if (!id) return;

    const courses = [
      {
        _id: "1",
        lectures: [
          {
            _id: "l1",
            title: "Intro to AI",
            fileUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            transcript: "Intro to AI transcript...",
            summary: ["AI basics", "History of AI"],
            topics: ["AI"],
          },
          {
            _id: "l2",
            title: "Neural Networks",
            fileUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            transcript: "Neural network transcript...",
            summary: ["Neurons", "Layers"],
            topics: ["ML", "NN"],
          },
        ],
      },
    ];

    let foundLecture = null;

    for (let course of courses) {
      const lectureData = course.lectures.find(
        (l) => l._id === id
      );
      if (lectureData) {
        foundLecture = lectureData;
        break;
      }
    }

    setLecture(foundLecture);
  }, [id]);

  // 🤖 AI HANDLER (FIXED)
  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    setTimeout(() => {
      setAnswer(
        `AI Answer: "${question}" is related to the key concepts explained in this lecture. Focus on understanding the fundamentals and examples shown in the video.`
      );
      setLoading(false);
    }, 1000);
  };

  if (!lecture) {
    return <p className="p-6 text-white">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 grid md:grid-cols-2 gap-6">

      {/* 🎥 VIDEO SECTION */}
      <div>
        <h1 className="text-2xl font-bold mb-4">
          {lecture.title}
        </h1>

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
        <p className="text-white/80">{lecture.transcript}</p>
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

        {/* ⏳ LOADING */}
        {loading && (
          <p className="mt-3 text-yellow-400">Thinking...</p>
        )}

        {/* 💬 ANSWER */}
        {answer && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            {answer}
          </div>
        )}
      </div>

    </div>
  );
}