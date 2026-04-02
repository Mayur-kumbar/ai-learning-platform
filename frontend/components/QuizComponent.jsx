import { useEffect, useState } from "react";
import api from "../lib/api";
import { mockQuiz } from "../lib/mockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const STORAGE_KEY = "quiz_progress_v1";

export default function QuizComponent({ lectureId }) {
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        let data;

        if (USE_MOCK) {
          data = mockQuiz;
        } else {
          const res = await api.get(`/quiz/${lectureId}`);
          data = res.data.questions || res.data;
        }

        if (!Array.isArray(data) || !data.length) {
          throw new Error();
        }

        setQuestions(data);
      } catch {
        setQuestions(mockQuiz);
      } finally {
        setLoading(false);
      }
    }

    fetchQuiz();
  }, [lectureId]);

  useEffect(() => {
    if (questions.length) {
      setAnswers(Array(questions.length).fill(null));
      setRevealed(Array(questions.length).fill(false));
    }
  }, [questions]);

  const handleSelect = (idx) => {
    if (revealed[currentIndex] || locked) return;

    const updated = [...answers];
    updated[currentIndex] = idx;
    setAnswers(updated);
  };

  const handleCheck = () => {
    if (answers[currentIndex] === null || locked) return;

    setLocked(true);

    const updated = [...revealed];
    updated[currentIndex] = true;
    setRevealed(updated);

    setTimeout(() => setLocked(false), 300);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((p) => p + 1);
    }
  };

  const handleSubmit = async () => {
    let s = 0;

    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) s++;
    });

    setScore(s);
    setSubmitted(true);
    localStorage.removeItem(STORAGE_KEY);

    if (!USE_MOCK) {
      try {
        await api.post("/quiz/submit", { lectureId, answers });
      } catch {}
    }
  };

  const getState = (qi, oi) => {
    const chosen = answers[qi];
    const correct = questions[qi].correctAnswer;

    if (!revealed[qi]) return chosen === oi ? "selected" : "default";
    if (oi === correct) return "correct";
    if (oi === chosen) return "wrong";
    return "dim";
  };

  if (loading)
    return <div className="text-white text-center mt-10">Loading...</div>;

  const current = questions[currentIndex];

  // START
  if (!started) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="w-full min-h-screen flex justify-center items-center bg-white/5">
          <div className="p-10 text-center w-full max-w-2xl">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6">
              Ready for Quiz?
            </h2>
            <button
              onClick={() => setStarted(true)}
              className="px-8 py-3 text-lg bg-yellow-400 text-black rounded-xl font-semibold"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RESULT
  if (submitted) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="w-full min-h-screen flex justify-center items-center bg-white/5">
          <div className="p-10 text-center w-full max-w-2xl">
            <h2 className="text-4xl font-bold text-yellow-400 mb-6">
              {score} / {questions.length}
            </h2>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 text-lg bg-yellow-400 text-black rounded-xl font-semibold"
            >
              Restart Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN QUIZ
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="w-full min-h-screen bg-white/5 flex justify-center">
        <div className="w-full max-w-4xl p-8 md:p-12">

          <h3 className="text-yellow-400 mb-3 text-sm md:text-base tracking-wide">
            Question {currentIndex + 1} / {questions.length}
          </h3>

          <p className="mb-6 text-lg md:text-xl font-medium">
            {current.question}
          </p>

          <div className="space-y-3">
            {current.options.map((opt, idx) => {
              const state = getState(currentIndex, idx);

              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`p-4 md:p-5 rounded-xl border cursor-pointer text-base md:text-lg ${
                    state === "selected"
                      ? "border-yellow-400 bg-yellow-400/10"
                      : state === "correct"
                      ? "border-green-400 bg-green-400/10"
                      : state === "wrong"
                      ? "border-red-400 bg-red-400/10"
                      : "border-white/10"
                  }`}
                >
                  {opt}
                </div>
              );
            })}
          </div>

          {revealed[currentIndex] && (
            <p
              className={`mt-4 text-sm md:text-base ${
                answers[currentIndex] === current.correctAnswer
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {answers[currentIndex] === current.correctAnswer
                ? "Correct answer"
                : "Wrong answer"}
            </p>
          )}

          <button
            onClick={() => {
              if (!revealed[currentIndex]) {
                handleCheck();
              } else if (currentIndex === questions.length - 1) {
                handleSubmit();
              } else {
                handleNext();
              }
            }}
            disabled={answers[currentIndex] === null}
            className="mt-6 w-full bg-yellow-400 text-black py-3 text-lg rounded-xl font-semibold"
          >
            {!revealed[currentIndex]
              ? "Check Answer"
              : currentIndex === questions.length - 1
              ? "Submit"
              : "Next"}
          </button>

        </div>
      </div>
    </div>
  );
}