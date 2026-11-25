import Link from "next/link";
import { useRouter } from "next/router";
import api from "@/lib/api";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { pausePlayingLecture } from "@/lib/engagementScoring";
import { useEngagementDetection } from "@/lib/engagementDetector";
import PrivacyConsentModal from "@/components/engagement/PrivacyConsentModal";
import EngagementStatusBadge from "@/components/engagement/EngagementStatusBadge";
import AbsencePauseOverlay from "@/components/engagement/AbsencePauseOverlay";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/api\/?$/, "");

const AI_ASK_ENDPOINT =
  process.env.NEXT_PUBLIC_AI_ASK_ENDPOINT || "/ai/ask";

const QUIZ_ENDPOINT =
  process.env.NEXT_PUBLIC_QUIZ_ENDPOINT || null;

const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeTranscript(transcript) {
  if (!transcript) return [];

  if (Array.isArray(transcript)) {
    return transcript
      .map((segment, index) => {
        if (typeof segment === "string") {
          return { id: index, start: null, end: null, text: segment };
        }

        return {
          id: segment._id || segment.id || index,
          start:
            typeof segment.start === "number"
              ? segment.start
              : typeof segment.startTime === "number"
                ? segment.startTime
                : null,
          end:
            typeof segment.end === "number"
              ? segment.end
              : typeof segment.endTime === "number"
                ? segment.endTime
                : null,
          text: segment.text || segment.content || "",
        };
      })
      .filter((segment) => segment.text);
  }

  if (typeof transcript === "string") {
    return transcript
      .split(/\n+/)
      .map((text, index) => ({
        id: index,
        start: null,
        end: null,
        text: text.trim(),
      }))
      .filter((segment) => segment.text);
  }

  return [];
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function normalizeQuiz(payload) {
  const questions =
    payload?.quiz?.questions ||
    payload?.questions ||
    payload?.data?.questions ||
    [];

  return questions
    .map((question, index) => ({
      id: String(question.id || question._id || `question-${index}`),
      question: question.question || question.text || "",
      options: Array.isArray(question.options)
        ? question.options.map((option) =>
            typeof option === "string"
              ? option
              : option.text || option.label || ""
          )
        : [],
      timestamp:
        typeof question.timestamp === "number" ? question.timestamp : null,
      // Correct answers are withheld until the backend grades the submission.
      correctAnswerIndex: null,
      explanation: question.explanation || "",
    }))
    .filter((question) => question.question && question.options.length === 4);
}

export default function LecturePage() {
  const { query } = useRouter();
  return <LecturePlayer key={query.id || "loading"} />;
}

function LecturePlayer() {
  const router = useRouter();
  const { id } = router.query;

  const videoElementRef = useRef(null);
  const videoJsPlayerRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const transcriptItemRefs = useRef({});
  const completedRef = useRef(false);
  const autoPlayPendingRef = useRef(false);

  const [hasStarted, setHasStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [lecture, setLecture] = useState(null);
  const [lectureLoading, setLectureLoading] = useState(true);
  const [lectureError, setLectureError] = useState("");

  const [showSummary, setShowSummary] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerSources, setAnswerSources] = useState([]);
  const [chatError, setChatError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [quiz, setQuiz] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizId, setQuizId] = useState(null);
  const [quizSubmission, setQuizSubmission] = useState(null);

  // In-Video Checkpoint Quiz state
  const [rawQuizQuestions, setRawQuizQuestions] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [completedCheckpoints, setCompletedCheckpoints] = useState(new Set());
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);
  const [checkpointAnswer, setCheckpointAnswer] = useState(null);
  const [checkpointResult, setCheckpointResult] = useState(null);
  const [checkpointChecking, setCheckpointChecking] = useState(false);

  const [focusEvents, setFocusEvents] = useState(0);
  const [focusNotice, setFocusNotice] = useState("");

  // ── Engagement Detection State ──────────────────────────────────────────────
  const [engagementEnabled, setEngagementEnabled] = useState(false);
  const [engagementMode, setEngagementMode] = useState("camera");
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [pauseReason, setPauseReason] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTranscriptId, setActiveTranscriptId] = useState(null);
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const transcriptSegments = useMemo(
    () => normalizeTranscript(lecture?.transcriptSegments || lecture?.transcript),
    [lecture]
  );

  const filteredTranscript = useMemo(() => {
    const search = transcriptSearch.trim().toLowerCase();
    if (!search) return transcriptSegments;
    return transcriptSegments.filter((segment) =>
      segment.text.toLowerCase().includes(search)
    );
  }, [transcriptSegments, transcriptSearch]);

  const positionRef = useRef(0);
  useEffect(() => { positionRef.current = currentTime; }, [currentTime]);
  useEffect(() => {
    if (!lecture || !["video", "youtube"].includes(lecture.fileType)) return;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || user?.role !== "student") return;
    let lastSaved = lecture.resumeSeconds || 0;
    const save = () => {
      const seconds = Math.floor(positionRef.current);
      if (seconds <= 0 || seconds === lastSaved) return;
      lastSaved = seconds;
      fetch(API_BASE_URL + "/api/lectures/" + lecture._id + "/position", {
        method: "PUT", headers: { Authorization: "Bearer " + token, "Content-Type":"application/json" },
        body: JSON.stringify({seconds}), keepalive: true
      }).then(response => { if (!response.ok) lastSaved = -1; }).catch(() => { lastSaved = -1; });
    };
    const timer = setInterval(save, 5000);
    window.addEventListener("pagehide", save);
    return () => { clearInterval(timer); window.removeEventListener("pagehide", save); save(); };
  }, [lecture]);

  const progress = duration > 0
    ? Math.min(100, Math.round((currentTime / duration) * 100))
    : 0;

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);

  const pauseForObservation = useCallback(reason => {
    if (pausePlayingLecture(videoJsPlayerRef.current, youtubePlayerRef.current)) setPauseReason(reason);
  }, []);

  const engagement = useEngagementDetection({
    onFocusPause: pauseForObservation,
    lectureId: id,
    isPlaying: isVideoPlaying && !pauseReason && !activeCheckpoint && isFullscreen,
    isTabActive,
    enabled: engagementEnabled,
    mode: engagementMode,
    lectureTimestamp: currentTime,
  });

  const cleanupPlayers = useCallback(() => {
    if (videoJsPlayerRef.current) {
      try {
        videoJsPlayerRef.current.dispose();
      } catch (error) {
        console.warn("Unable to dispose Video.js player:", error);
      }
      videoJsPlayerRef.current = null;
    }

    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.destroy();
      } catch (error) {
        console.warn("Unable to destroy YouTube player:", error);
      }
      youtubePlayerRef.current = null;
    }
  }, []);

  const handleLectureCompleted = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setShowQuiz(true);
  }, []);

  // Fetch lecture data and cancel stale requests when the route changes.
  useEffect(() => {
    if (!router.isReady || !id) return;

    const controller = new AbortController();

    async function fetchLecture() {
      setLectureLoading(true);
      setLectureError("");
      setLecture(null);
      completedRef.current = false;
      autoPlayPendingRef.current = false;
      setHasStarted(false);
      setShowQuiz(false);
      setQuiz([]);
      setRawQuizQuestions([]);
      setQuizId(null);
      setQuizSubmitted(false);
      setQuizSubmission(null);
      setQuizError("");
      setCurrentTime(0);
      setDuration(0);
      setCompletedCheckpoints(new Set());
      setActiveCheckpoint(null);
      setCheckpointAnswer(null);
      setCheckpointResult(null);

      try {
        const response = await api.get(`/lectures/${id}`, {
          signal: controller.signal,
        });
        setLecture(response.data?.lecture || response.data);
      } catch (error) {
        if (error.name !== "CanceledError" && error.name !== "AbortError") {
          setLectureError(
            getErrorMessage(error, "Unable to load this lecture.")
          );
        }
      } finally {
        if (!controller.signal.aborted) setLectureLoading(false);
      }
    }

    fetchLecture();

    return () => controller.abort();
  }, [id, router.isReady]);

  // Load pre-generated quiz questions for in-video checkpoints
  useEffect(() => {
    if (!router.isReady || !id) return;

    let cancelled = false;

    async function loadQuizData() {
      try {
        const res = await api.get(`/quiz/${id}`);
        if (cancelled) return;
        const normalized = normalizeQuiz(res.data);
        const qs = normalized.length > 0 ? normalized : (res.data?.questions || []);
        setRawQuizQuestions(qs);
        setQuizId(res.data?.quizId || null);
        if (qs.length > 0) {
          setQuiz(qs);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Quiz not loaded for lecture:", err?.message);
        }
      }
    }

    loadQuizData();

    return () => {
      cancelled = true;
    };
  }, [id, router.isReady]);

  // Derive checkpoint timestamps when duration or questions are available
  useEffect(() => {
    if (!rawQuizQuestions.length) return;

    const effectiveDuration =
      duration > 0
        ? duration
        : videoJsPlayerRef.current?.duration?.() || 0;

    if (effectiveDuration <= 0) return;

    const hasExplicit = rawQuizQuestions.some(
      (q) => typeof q.timestamp === "number" && q.timestamp > 0
    );

    let prepared = [];
    if (hasExplicit) {
      prepared = rawQuizQuestions
        .map((q, originalIndex) => ({
          ...q,
          originalIndex,
          id: q.id || q._id || `checkpoint-${originalIndex}`,
        }))
        .filter((q) => typeof q.timestamp === "number" && q.timestamp > 0);
    } else {
      // Create 2 in-video checkpoints at ~35% and ~70% of duration (or 1 at 50% if only 1 question)
      const count = Math.min(2, rawQuizQuestions.length);
      const ratios = count === 1 ? [0.5] : [0.35, 0.70];

      prepared = ratios.map((ratio, idx) => ({
        ...rawQuizQuestions[idx],
        originalIndex: idx,
        id: rawQuizQuestions[idx].id || rawQuizQuestions[idx]._id || `checkpoint-${idx}`,
        timestamp: Math.round(effectiveDuration * ratio),
      }));
    }

    setCheckpoints(prepared);
  }, [rawQuizQuestions, duration]);

  // In-Video Checkpoint Trigger: Monitor currentTime against pending checkpoints
  useEffect(() => {
    if (
      !hasStarted ||
      checkpoints.length === 0 ||
      activeCheckpoint
    ) {
      return;
    }

    const candidate = checkpoints.find((cp) => {
      const keys = [
        cp.id,
        cp._id,
        String(cp.originalIndex),
        `checkpoint-${cp.originalIndex}`,
      ].filter(Boolean);
      if (keys.some((k) => completedCheckpoints.has(k))) return false;
      return currentTime >= cp.timestamp && currentTime <= cp.timestamp + 4;
    });

    if (candidate) {
      if (videoJsPlayerRef.current && !videoJsPlayerRef.current.paused()) {
        videoJsPlayerRef.current.pause();
      }
      if (youtubePlayerRef.current?.pauseVideo) {
        youtubePlayerRef.current.pauseVideo();
      }

      setActiveCheckpoint(candidate);
      setCheckpointAnswer(null);
      setCheckpointResult(null);
    }
  }, [
    currentTime,
    hasStarted,
    checkpoints,
    activeCheckpoint,
    completedCheckpoints,
  ]);

  // Uploaded video player.
  useEffect(() => {
    if (!lecture || lecture.fileType !== "video" || !videoElementRef.current) {
      return;
    }

    cleanupPlayers();

    const source = lecture.fileUrl?.startsWith("http")
      ? lecture.fileUrl
      : `${API_BASE_URL}${lecture.fileUrl || ""}`;

    const player = videojs(videoElementRef.current, {
      controls: true,
      responsive: true,
      fluid: true,
      preload: "metadata",
      autoplay: false,
      sources: source
        ? [{ src: source, type: lecture.mimeType || "video/mp4" }]
        : [],
    });

    videoJsPlayerRef.current = player;

    player.on("loadedmetadata", () => {
      setDuration(player.duration() || 0);
      if (lecture.resumeSeconds > 0) player.currentTime(lecture.resumeSeconds);
      if (autoPlayPendingRef.current) {
        autoPlayPendingRef.current = false;
        player.play();
      }
    });

    player.on("timeupdate", () => {
      setCurrentTime(player.currentTime() || 0);
    });

    player.on("playing", () => setIsVideoPlaying(true));
    player.on("waiting", () => setIsVideoPlaying(false));
    player.on("seeking", () => setIsVideoPlaying(false));
    player.on("pause", () => setIsVideoPlaying(false));
    player.on("ended", () => setIsVideoPlaying(false));

    player.on("ended", handleLectureCompleted);

    player.on("error", () => {
      setLectureError(
        "The video could not be played. Check the file URL and supported video format."
      );
    });

    return cleanupPlayers;
  }, [lecture, cleanupPlayers, handleLectureCompleted]);

  // YouTube player API. The IFrame API is required to detect video completion.
  useEffect(() => {
    if (
      !lecture ||
      lecture.fileType !== "youtube" ||
      !lecture.youtubeVideoId
    ) {
      return;
    }

    let cancelled = false;
    let pollId;

    const initializePlayer = () => {
      if (cancelled || !window.YT?.Player) return;

      const mount = document.getElementById("youtube-lecture-player");
      if (!mount) return;

      youtubePlayerRef.current = new window.YT.Player(mount, {
        videoId: lecture.youtubeVideoId,
        playerVars: {
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          start: Math.floor(lecture.resumeSeconds || 0),
          fs: 0,
          autoplay: 0,
        },
        events: {
          onReady: (event) => {
            const player = event?.target || youtubePlayerRef.current;
            if (typeof player?.getDuration === "function") {
              setDuration(player.getDuration() || 0);
            }
            if (autoPlayPendingRef.current) {
              autoPlayPendingRef.current = false;
              if (typeof player?.playVideo === "function") {
                player.playVideo();
              }
            }
          },
          onStateChange: (event) => {
            setIsVideoPlaying(event.data === window.YT?.PlayerState?.PLAYING);
            if (event.data === window.YT?.PlayerState?.ENDED) {
              handleLectureCompleted();
            }
            if (
              event.data === window.YT?.PlayerState?.PLAYING ||
              event.data === window.YT?.PlayerState?.PAUSED
            ) {
              const player = event?.target || youtubePlayerRef.current;
              if (typeof player?.getCurrentTime === "function") {
                setCurrentTime(player.getCurrentTime() || 0);
              }
              if (typeof player?.getDuration === "function") {
                setDuration(player.getDuration() || 0);
              }
              setIsVideoPlaying(event.data === window.YT?.PlayerState?.PLAYING);
            }
          },
          onError: () => {
            setLectureError(
              "The YouTube video could not be embedded. It may be private or embedding may be disabled."
            );
          },
        },
      });

      pollId = window.setInterval(() => {
        const player = youtubePlayerRef.current;
        if (typeof player?.getCurrentTime !== "function") return;
        setCurrentTime(player.getCurrentTime() || 0);
        if (typeof player?.getDuration === "function") {
          setDuration(player.getDuration() || 0);
        }
      }, 1000);
    };

    const existingScript = document.querySelector(
      `script[src="${YOUTUBE_API_URL}"]`
    );

    if (window.YT?.Player) {
      initializePlayer();
    } else {
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = YOUTUBE_API_URL;
        document.head.appendChild(script);
      }

      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousCallback === "function") previousCallback();
        initializePlayer();
      };

      // Handle an API script that loaded before this component's callback.
      let attempts = 0;
      const readyCheck = window.setInterval(() => {
        attempts += 1;
        if (window.YT?.Player) {
          window.clearInterval(readyCheck);
          initializePlayer();
        } else if (attempts > 100) {
          window.clearInterval(readyCheck);
          if (!cancelled) {
            setLectureError("The YouTube player API failed to load.");
          }
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      cleanupPlayers();
    };
  }, [lecture, cleanupPlayers, handleLectureCompleted]);

  const checkIsFullscreen = useCallback(() => {
    if (typeof document === "undefined") return false;
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }, []);

  const startLectureInFullscreen = useCallback(async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }

      setIsFullscreen(true);
      setHasStarted(true);

      if (videoJsPlayerRef.current) {
        videoJsPlayerRef.current.play();
      } else if (youtubePlayerRef.current?.playVideo) {
        youtubePlayerRef.current.playVideo();
      } else {
        autoPlayPendingRef.current = true;
      }
    } catch (err) {
      console.error("Fullscreen error on start:", err);
      setFocusNotice(
        "Please allow full-screen mode in your browser to start the lecture."
      );
    }
  }, []);

  const resumeLectureInFullscreen = useCallback(async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }

      setIsFullscreen(true);

      if (videoJsPlayerRef.current) {
        videoJsPlayerRef.current.play();
      } else if (youtubePlayerRef.current?.playVideo) {
        youtubePlayerRef.current.playVideo();
      }
    } catch (err) {
      console.error("Fullscreen error on resume:", err);
      setFocusNotice(
        "Please allow full-screen mode to resume the lecture."
      );
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (checkIsFullscreen()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Error exiting fullscreen:", err);
    }
  }, [checkIsFullscreen]);

  // Full-screen enforcement: Pause when user exits full screen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = checkIsFullscreen();
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && hasStarted) {
        if (videoJsPlayerRef.current && !videoJsPlayerRef.current.paused()) {
          videoJsPlayerRef.current.pause();
        }
        if (youtubePlayerRef.current?.pauseVideo) {
          youtubePlayerRef.current.pauseVideo();
        }

        setFocusEvents((count) => count + 1);
        setFocusNotice(
          "⚠️ Full-screen mode exited! Lecture playback has been paused."
        );
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [hasStarted, checkIsFullscreen]);

  // Tab switching / visibility monitoring: Pause if user leaves the tab
  useEffect(() => {
    if (!lecture) return;

    let wasHidden = document.hidden;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      if (isHidden && !wasHidden) {
        if (hasStarted) {
          if (videoJsPlayerRef.current && !videoJsPlayerRef.current.paused()) {
            videoJsPlayerRef.current.pause();
          }
          if (youtubePlayerRef.current?.pauseVideo) {
            youtubePlayerRef.current.pauseVideo();
          }
        }
        setFocusEvents((count) => count + 1);
        setFocusNotice(
          "⚠️ You left the lecture window. Lecture playback has been paused."
        );
      }
      wasHidden = isHidden;
      setIsTabActive(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [lecture, hasStarted]);

  useEffect(() => {
    if (!focusNotice) return;
    const timer = window.setTimeout(() => setFocusNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [focusNotice]);

  // Keep the currently active transcript segment visible.
  useEffect(() => {
    const active = transcriptSegments.find((segment) => {
      if (segment.start === null) return false;
      const end = segment.end ?? segment.start + 10;
      return currentTime >= segment.start && currentTime <= end;
    });

    if (active) {
      setActiveTranscriptId(active.id);
      transcriptItemRefs.current[active.id]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentTime, transcriptSegments]);

  const seekTo = useCallback((seconds) => {
    if (!hasStarted || !isFullscreen) {
      setFocusNotice("Please enter full-screen mode to watch and navigate the lecture.");
      return;
    }
    if (!Number.isFinite(seconds)) return;

    if (videoJsPlayerRef.current) {
      videoJsPlayerRef.current.currentTime(seconds);
      return;
    }

    if (youtubePlayerRef.current?.seekTo) {
      youtubePlayerRef.current.seekTo(seconds, true);
    }
  }, [hasStarted, isFullscreen]);

  const handleCheckCheckpointAnswer = async () => {
    if (!activeCheckpoint || checkpointAnswer === null || checkpointChecking) return;

    setCheckpointChecking(true);
    try {
      const res = await api.post("/quiz/check-answer", {
        lectureId: id,
        questionId: activeCheckpoint.id,
        answerIndex: checkpointAnswer,
      });

      setCheckpointResult({
        isCorrect: res.data.isCorrect,
        correctIndex: res.data.correctIndex,
        explanation: res.data.explanation,
      });
    } catch (err) {
      // Never guess correctness when server verification fails.
      setCheckpointResult({
        isCorrect: false,
        correctIndex: null,
        explanation: getErrorMessage(
          err,
          "Your answer could not be verified. Check your connection and try again."
        ),
        verificationFailed: true,
      });
    } finally {
      setCheckpointChecking(false);
    }
  };

  const handleContinueAfterCheckpoint = () => {
    if (!activeCheckpoint) return;

    const cp = activeCheckpoint;
    const keys = [
      cp.id,
      cp._id,
      String(cp.originalIndex),
      `checkpoint-${cp.originalIndex}`,
    ].filter(Boolean);

    setCompletedCheckpoints((prev) => new Set([...prev, ...keys]));
    setActiveCheckpoint(null);
    setCheckpointAnswer(null);
    setCheckpointResult(null);

    // Advance playback by 2 seconds to cleanly move past the checkpoint window
    const resumeTime = (cp.timestamp ?? currentTime) + 2;
    if (videoJsPlayerRef.current) {
      videoJsPlayerRef.current.currentTime(resumeTime);
      videoJsPlayerRef.current.play();
    } else if (youtubePlayerRef.current?.seekTo) {
      youtubePlayerRef.current.seekTo(resumeTime, true);
      youtubePlayerRef.current.playVideo?.();
    }
  };

  const handleAsk = async (event) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || chatLoading || !id) return;

    setChatLoading(true);
    setChatError("");
    setAnswer("");
    setAnswerSources([]);

    try {
      const response = await api.post(AI_ASK_ENDPOINT, {
        lectureId: id,
        question: trimmedQuestion,
      });

      const data = response.data;
      const generatedAnswer =
        data?.answer || data?.response || data?.data?.answer;

      if (!generatedAnswer) {
        throw new Error(
          "The AI service returned no answer. Check the API response format."
        );
      }

      setAnswer(generatedAnswer);
      setAnswerSources(
        Array.isArray(data?.sources)
          ? data.sources
          : Array.isArray(data?.citations)
            ? data.citations
            : []
      );
    } catch (error) {
      setChatError(
        getErrorMessage(
          error,
          "Unable to get an answer. Please check the AI service and try again."
        )
      );
    } finally {
      setChatLoading(false);
    }
  };

  const generateQuiz = useCallback(async () => {
    if (!id || quizLoading) return;

    setQuizLoading(true);
    setQuizError("");
    setQuiz([]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizSubmission(null);
    setShowQuiz(true);

    try {
      // Python generates the quiz during lecture processing; this loads the saved quiz.
      const response = await api.get(`/quiz/${id}`);
      const loadedQuestions = normalizeQuiz(response.data);

      if (!loadedQuestions.length) {
        throw new Error("No valid quiz questions are available for this lecture yet.");
      }

      setQuizId(response.data?.quizId || null);
      setQuiz(loadedQuestions);
    } catch (error) {
      setQuizError(
        getErrorMessage(
          error,
          "Unable to load the quiz. Lecture processing may still be running."
        )
      );
    } finally {
      setQuizLoading(false);
    }
  }, [id, quizLoading]);

  // Automatically load the saved quiz when the video reaches its ended state.
  // If questions were already fetched for checkpoints, they are reused instead.
  useEffect(() => {
    if (!showQuiz || quiz.length > 0 || quizLoading || quizError) return;
    generateQuiz();
  }, [showQuiz, quiz.length, quizLoading, quizError, generateQuiz]);

  const attemptKey = useRef(null);
  const submitQuiz = async () => {
    if (!quiz.length || quizSubmitted || quizLoading) return;

    if (!quizId) {
      setQuizError("Quiz ID is missing. Reload the quiz before submitting.");
      return;
    }

    const allAnswered = quiz.every((item) =>
      Number.isInteger(quizAnswers[item.id])
    );

    if (!allAnswered) {
      setQuizError("Answer every question before submitting.");
      return;
    }

    setQuizLoading(true);
    setQuizError("");

    try {
      attemptKey.current ||= globalThis.crypto?.randomUUID?.() || String(Date.now());
      const response = await api.post("/quiz/submit", {
        attemptKey: attemptKey.current,
        quizId,
        lectureId: id,
        answers: quiz.map((item) => quizAnswers[item.id]),
      });

      const correctAnswers = Array.isArray(response.data?.correctAnswers)
        ? response.data.correctAnswers
        : [];

      setQuiz((previous) =>
        previous.map((item, index) => ({
          ...item,
          explanation: response.data.explanations?.[index] || "",
          correctAnswerIndex: Number.isInteger(correctAnswers[index])
            ? correctAnswers[index]
            : null,
        }))
      );

      attemptKey.current = null;
      setQuizSubmission({
        score: response.data.score,
        correct: response.data.correct,
        total: response.data.total,
      });
      setQuizSubmitted(true);
    } catch (error) {
      setQuizError(
        getErrorMessage(error, "Unable to submit your quiz answers.")
      );
    } finally {
      setQuizLoading(false);
    }
  };

  const quizScore = quizSubmission?.correct ?? 0;

  const handleAcceptEngagement = useCallback(() => {
    setShowPrivacyModal(false);
    setEngagementMode("camera");
    setEngagementEnabled(true);
    engagement.requestCamera();
  }, [engagement]);

  const handleBehavioralEngagement = useCallback(() => {
    setShowPrivacyModal(false);
    setEngagementMode("behavioral");
    setEngagementEnabled(true);
  }, []);

  const handleDeclineEngagement = useCallback(() => {
    setShowPrivacyModal(false);
  }, []);

  const handleToggleEngagement = useCallback(() => {
    if (engagementEnabled) {
      setEngagementEnabled(false);
      engagement.stopCamera();
    } else {
      setShowPrivacyModal(true);
    }
  }, [engagementEnabled, engagement]);

  function handleAbsenceResume(disableTracking = false) {
    setPauseReason(null);
    if (disableTracking) {
      setEngagementEnabled(false);
      engagement.stopCamera();
    }
    if (document.hidden || !checkIsFullscreen() || activeCheckpoint) return;
    if (videoJsPlayerRef.current) {
      videoJsPlayerRef.current.play()?.catch(() => setFocusNotice("Press Play to continue."));
    } else youtubePlayerRef.current?.playVideo?.();
  }

  const togglePlayPause = useCallback(() => {
    if (videoJsPlayerRef.current) {
      if (videoJsPlayerRef.current.paused()) {
        videoJsPlayerRef.current.play();
      } else {
        videoJsPlayerRef.current.pause();
      }
      return;
    }

    if (youtubePlayerRef.current) {
      try {
        const state =
          typeof youtubePlayerRef.current.getPlayerState === "function"
            ? youtubePlayerRef.current.getPlayerState()
            : null;
        if (state === window.YT?.PlayerState?.PLAYING) {
          youtubePlayerRef.current.pauseVideo();
        } else {
          youtubePlayerRef.current.playVideo();
        }
      } catch {
        if (isVideoPlaying) {
          youtubePlayerRef.current?.pauseVideo?.();
        } else {
          youtubePlayerRef.current?.playVideo?.();
        }
      }
    }
  }, [isVideoPlaying]);

  if (!router.isReady || lectureLoading) {
    return (
      <main className="lecture-studio min-h-screen bg-slate-950 text-white grid place-items-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-indigo-400/20 border-t-cyan-400" />
          <p className="text-white/70">Loading lecture...</p>
        </div>
      </main>
    );
  }

  if (lectureError && !lecture) {
    return (
      <main className="lecture-studio min-h-screen bg-slate-950 text-white grid place-items-center p-6">
        <div className="max-w-lg rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-center">
          <h1 className="text-xl font-semibold text-red-300">
            Unable to load lecture
          </h1>
          <p className="mt-3 text-sm text-white/70">{lectureError}</p>
          <button
            onClick={() => router.reload()}
            className="mt-5 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!lecture) return null;

  const transcriptStatus = lecture.transcriptStatus;
  const transcriptUnavailable = transcriptStatus === "unavailable";

  return (
    <main className="lecture-studio min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      {showPrivacyModal && (
        <PrivacyConsentModal
          onAccept={handleAcceptEngagement}
          onBehavioral={handleBehavioralEngagement}
          onDecline={handleDeclineEngagement}
        />
      )}
      {pauseReason && <AbsencePauseOverlay reason={pauseReason} onResume={handleAbsenceResume} />}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <section className="min-w-0 space-y-5">
          <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-300">
                Learning space
              </p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                {lecture.title || "Untitled lecture"}
              </h1>
              {lecture.description && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                  {lecture.description}
                </p>
              )}
            </div>
            {hasStarted && (
              <div className="flex shrink-0 flex-col items-start gap-2 pt-1 sm:items-end">
                <EngagementStatusBadge
                  score={engagement.score}
                  confidence={engagement.confidence}
                  category={engagement.category}
                  enabled={engagementEnabled}
                  mode={engagementMode}
                  modelStatus={engagement.modelStatus}
                  cameraActive={engagement.cameraActive}
                  cameraError={engagement.cameraError}
                  onToggle={handleToggleEngagement}
                />
                {engagementEnabled && engagementMode === "camera" && (
                  <figure className="w-40 overflow-hidden rounded-lg border border-white/30 bg-slate-950">
                    <video ref={engagement.previewRef} aria-label="Your live camera preview" autoPlay muted playsInline
                      className="aspect-video w-full -scale-x-100 object-cover" />
                    <figcaption className="px-2 py-1 text-xs text-white">
                      {engagement.cameraError || (engagement.modelStatus === "loading" ? "Starting camera…" :
                        !isVideoPlaying ? "Playback paused" : engagement.cameraMessage || "Your camera")}
                    </figcaption>
                  </figure>
                )}
              </div>
            )}
          </header>

          {focusNotice && (
            <div
              role="status"
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
            >
              {focusNotice}
            </div>
          )}

          {focusEvents > 0 && (
            <p className="text-xs text-white/40">
              Focus events recorded: {focusEvents}. Stay in full-screen mode to avoid interruptions.
            </p>
          )}

          {/* Full-Screen Mode Active Indicator */}
          {hasStarted && isFullscreen && (
            <div className="flex items-center justify-between rounded-xl border border-indigo-400/20 bg-indigo-950/40 px-4 py-2.5 text-xs text-indigo-200">
              <div className="flex items-center gap-2">
                <span className={`flex h-2 w-2 rounded-full ${isVideoPlaying ? "bg-indigo-400 animate-pulse" : "bg-amber-400"}`} />
                <span className="font-medium">Full-Screen Learning Active</span>
                <span className="text-white/40">·</span>
                <span className="text-white/60">{isVideoPlaying ? "Playing" : "Paused"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/30 transition active:scale-95 cursor-pointer"
                >
                  {isVideoPlaying ? "⏸ Pause" : "▶ Play"}
                </button>
                <button
                  type="button"
                  onClick={exitFullscreen}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  title="Pause and exit full screen"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Full Screen
                </button>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black min-h-[340px] flex items-center justify-center">
            {lecture.fileType === "reading" && (
              <article aria-label="Lecture reading" className="w-full whitespace-pre-wrap p-8 leading-8">{lecture.transcript}</article>
            )}
            {lecture.fileType === "video" && (
              <div data-vjs-player className="w-full">
                <video
                  ref={videoElementRef}
                  className="video-js vjs-big-play-centered w-full"
                  playsInline
                />
              </div>
            )}

            {lecture.fileType === "youtube" && lecture.youtubeVideoId && (
              <div className="aspect-video w-full">
                <div id="youtube-lecture-player" className="h-full w-full" />
              </div>
            )}

            {lecture.fileType === "youtube" && !lecture.youtubeVideoId && (
              <div className="p-8 text-center text-sm text-red-300">
                This YouTube lecture has no valid video ID.
              </div>
            )}

            {lecture.fileType === "pdf" && lecture.fileUrl && (
              <iframe
                title={`${lecture.title || "Lecture"} PDF`}
                src={
                  lecture.fileUrl.startsWith("http")
                    ? lecture.fileUrl
                    : `${API_BASE_URL}${lecture.fileUrl}`
                }
                className="h-[70vh] min-h-[480px] w-full bg-white"
              />
            )}

            {!["video", "youtube", "pdf"].includes(lecture.fileType) && (
              <div className="p-8 text-center text-white/60">
                No supported media is available for this lecture.
              </div>
            )}

            {/* GATE 1: Full-screen mandatory to start lecture */}
            {!hasStarted && ["video","youtube"].includes(lecture.fileType) && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center backdrop-blur-md">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 shadow-inner shadow-cyan-500/20">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
                <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Mandatory Full Screen
                </span>
                <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                  Enter Full Screen to Start Lecture
                </h3>
                <p className="mt-2 max-w-md text-sm text-white/70">
                  To ensure focus and compliance, this lecture will only start when full-screen mode is activated. Exiting full-screen or switching tabs will automatically pause the lecture.
                </p>
                <button
                  type="button"
                  onClick={startLectureInFullscreen}
                  className="mt-6 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:scale-105 hover:from-cyan-400 hover:to-blue-500 active:scale-95"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Enter Full Screen & Start Lecture
                </button>
              </div>
            )}

            {/* GATE 2: Full-screen exited during lecture -> Paused */}
            {hasStarted && !isFullscreen && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 p-6 text-center backdrop-blur-md">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-300">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Lecture Paused
                </span>
                <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                  Full Screen Mode Exited
                </h3>
                <p className="mt-2 max-w-md text-sm text-white/70">
                  Playback is locked. You must return to full-screen mode to continue watching this lecture.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={resumeLectureInFullscreen}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-400/20 transition hover:scale-105 active:scale-95"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Re-enter Full Screen to Resume
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 transition"
                  >
                    Exit to Course
                  </button>
                </div>
              </div>
            )}

            {/* GATE 3: In-Video Checkpoint Quiz Modal */}
            {activeCheckpoint && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 p-4 sm:p-6 text-white backdrop-blur-md overflow-y-auto">
                <div className="w-full max-w-xl rounded-2xl border border-indigo-400/30 bg-slate-900/95 p-5 sm:p-6 shadow-2xl shadow-cyan-950/60">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 text-lg">
                        🎯
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Knowledge Checkpoint</h3>
                        <p className="text-xs text-white/50">
                          Verify your understanding to resume lecture
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-1 text-xs font-mono font-medium text-indigo-300">
                      {formatTime(activeCheckpoint.timestamp)}
                    </span>
                  </div>

                  {/* Question */}
                  <p className="text-sm sm:text-base font-medium text-white/95 mb-4 leading-relaxed">
                    {activeCheckpoint.question}
                  </p>

                  {/* Options */}
                  <div className="space-y-2.5 mb-5">
                    {activeCheckpoint.options.map((option, optIdx) => {
                      const isSelected = checkpointAnswer === optIdx;
                      let optionStyle = "border-white/10 bg-white/5 hover:bg-white/10 text-white/80";

                      if (checkpointResult) {
                        if (optIdx === checkpointResult.correctIndex) {
                          optionStyle = "border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold";
                        } else if (isSelected && !checkpointResult.isCorrect) {
                          optionStyle = "border-red-500 bg-red-500/20 text-red-200";
                        } else {
                          optionStyle = "border-white/5 bg-white/[0.02] text-white/40";
                        }
                      } else if (isSelected) {
                        optionStyle = "border-indigo-400 bg-indigo-500/20 text-indigo-200 font-medium";
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={checkpointResult !== null || checkpointChecking}
                          onClick={() => setCheckpointAnswer(optIdx)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-xs sm:text-sm transition ${optionStyle}`}
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected ? "bg-indigo-400 text-slate-950" : "bg-white/10 text-white/60"
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{option}</span>
                          {checkpointResult && optIdx === checkpointResult.correctIndex && (
                            <span className="text-emerald-400 font-bold text-sm">✓</span>
                          )}
                          {checkpointResult && isSelected && !checkpointResult.isCorrect && (
                            <span className="text-red-400 font-bold text-sm">✗</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback Explanation */}
                  {checkpointResult && (
                    <div className={`rounded-xl border p-3.5 mb-5 text-xs leading-relaxed ${
                      checkpointResult.isCorrect
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-400/30 bg-amber-500/10 text-amber-200"
                    }`}>
                      <p className="font-semibold mb-1">
                        {checkpointResult.verificationFailed
                          ? "Answer not verified"
                          : checkpointResult.isCorrect
                            ? "🎉 Correct!"
                            : "💡 Explanation:"}
                      </p>
                      <p className="text-white/85">
                        {checkpointResult.explanation || (checkpointResult.isCorrect ? "Great understanding! You can now proceed." : "Review this segment if needed.")}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3">
                    {!checkpointResult ? (
                      <button
                        type="button"
                        disabled={checkpointAnswer === null || checkpointChecking}
                        onClick={handleCheckCheckpointAnswer}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {checkpointChecking ? "Verifying..." : "Check Answer"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleContinueAfterCheckpoint}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:scale-105 active:scale-95"
                      >
                        Continue Lecture ▶
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {lectureError && (
            <div
              role="alert"
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {lectureError}
            </div>
          )}

          {duration > 0 && (
            <section className="rounded-xl border border-white/10 bg-[#192338] p-4">
              <div className="mb-2 flex justify-between text-xs text-white/60">
                <span className="flex items-center gap-1.5">
                  <span>Lecture progress</span>
                  {checkpoints.length > 0 && (
                    <span className="text-cyan-400 font-medium">
                      · {completedCheckpoints.size}/{checkpoints.length} Checkpoints
                    </span>
                  )}
                </span>
                <span>
                  {formatTime(currentTime)} / {formatTime(duration)} · {progress}%
                </span>
              </div>
              <div className="relative mt-2">
                <div
                  className="relative h-2.5 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Lecture playback progress"
                >
                  <div
                    className="h-full rounded-full bg-indigo-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* In-video Checkpoint pins on timeline */}
                {checkpoints.map((cp, idx) => {
                  if (!cp.timestamp || duration <= 0) return null;
                  const leftPercent = Math.min(98, Math.max(2, (cp.timestamp / duration) * 100));
                  const isDone = completedCheckpoints.has(cp.id || cp.originalIndex);
                  return (
                    <div
                      key={cp.id || idx}
                      className="group absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                      style={{ left: `${leftPercent}%` }}
                      onClick={() => seekTo(Math.max(0, cp.timestamp - 2))}
                      title={`Checkpoint ${idx + 1} at ${formatTime(cp.timestamp)} (${isDone ? "Completed" : "Pending"})`}
                    >
                      <div
                        className={`h-3.5 w-3.5 rounded-full border-2 border-slate-950 transition-transform group-hover:scale-125 ${
                          isDone
                            ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                            : "bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse"
                        }`}
                      />
                      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 border border-white/10 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 z-20">
                        🎯 Checkpoint {idx + 1} ({formatTime(cp.timestamp)})
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-700 bg-[#192338] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Lecture summary</h2>
              <button
                type="button"
                onClick={() => setShowSummary((value) => !value)}
                aria-expanded={showSummary}
                className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                {showSummary ? "Hide summary" : "Show summary"}
              </button>
            </div>

            {showSummary && (
              <div className="mt-4">
                {Array.isArray(lecture.summary) && lecture.summary.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-white/75">
                    {lecture.summary.map((point, index) => (
                      <li key={`${index}-${String(point).slice(0, 20)}`}>
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/45">
                    No summary is available for this lecture yet.
                  </p>
                )}
              </div>
            )}

            {Array.isArray(lecture.topics) && lecture.topics.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-medium text-white/70">
                  Topics covered
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lecture.topics.map((topic, index) => (
                    <span
                      key={`${index}-${topic}`}
                      className="rounded-full border border-indigo-300/20 bg-indigo-200/10 px-3 py-1 text-xs text-indigo-200"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-700 bg-[#192338] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Lecture assessment</h2>
                <p className="mt-1 text-sm text-white/50">
                  Score at least 70% on this assessment to complete the lecture.
                </p>
              </div>
              <button
                type="button"
                onClick={generateQuiz}
                disabled={quizLoading}
                className="rounded-lg bg-indigo-200 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {quizLoading ? "Loading..." : "Load quiz"}
              </button>
            </div>

            {showQuiz && (
              <div className="mt-5 space-y-5">
                {quizLoading && (
                  <p className="text-sm text-indigo-200">
                    Loading saved lecture questions...
                  </p>
                )}

                {quizError && (
                  <p role="alert" className="text-sm text-red-300">
                    {quizError}
                  </p>
                )}

                {quiz.map((item, questionIndex) => (
                  <fieldset
                    key={item.id}
                    className="rounded-xl border border-white/10 p-4"
                    disabled={quizSubmitted}
                  >
                    <legend className="px-1 text-sm font-medium">
                      {questionIndex + 1}. {item.question}
                    </legend>
                    <div className="mt-3 space-y-2">
                      {item.options.map((option, optionIndex) => {
                        const selected =
                          quizAnswers[item.id] === optionIndex;
                        const isCorrect =
                          item.correctAnswerIndex === optionIndex;

                        let optionClass =
                          "border-white/10 bg-[#192338] hover:bg-white/[0.07]";
                        if (selected) {
                          optionClass =
                            "border-indigo-300/60 bg-indigo-200/10";
                        }
                        if (quizSubmitted && isCorrect) {
                          optionClass =
                            "border-emerald-400/50 bg-emerald-400/10";
                        }
                        if (
                          quizSubmitted &&
                          selected &&
                          item.correctAnswerIndex !== null &&
                          !isCorrect
                        ) {
                          optionClass =
                            "border-red-400/50 bg-red-400/10";
                        }

                        return (
                          <label
                            key={`${item.id}-${optionIndex}`}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${optionClass}`}
                          >
                            <input
                              type="radio"
                              name={item.id}
                              checked={selected}
                              disabled={quizSubmitted}
                              onChange={() =>
                                setQuizAnswers((previous) => ({
                                  ...previous,
                                  [item.id]: optionIndex,
                                }))
                              }
                              className="mt-0.5 accent-cyan-300"
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>

                    {quizSubmitted && item.explanation && (
                      <p className="mt-3 text-sm text-white/60">
                        {item.explanation}
                      </p>
                    )}
                  </fieldset>
                ))}

                {quiz.length > 0 && !quizSubmitted && (
                  <button
                    type="button"
                    onClick={submitQuiz}
                    className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
                  >
                    Submit answers
                  </button>
                )}

                {quizSubmitted && (
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                    <p className="font-semibold text-emerald-200">
                      Assessment saved
                    </p>
                    <Link className="underline text-indigo-200" href="/student/dashboard">View progress and revision topics</Link>
                    {quizSubmission && (
                      <p className="mt-1 text-sm text-white/75">
                        Score: {quizScore} / {quizSubmission.total} (
                        {Math.round((quizScore / quizSubmission.total) * 100)}%)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </section>

        <aside className="min-w-0 space-y-5">
          <section className="flex h-[560px] min-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#192338]">
            <div className="border-b border-white/10 p-4">
              <h2 className="font-semibold">Lecture transcript</h2>
              <p className="mt-1 text-xs text-white/45">
                {transcriptSegments.length} transcript segments
              </p>
              <input
                type="search"
                value={transcriptSearch}
                onChange={(event) => setTranscriptSearch(event.target.value)}
                placeholder="Search transcript..."
                aria-label="Search transcript"
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:border-indigo-300/50"
              />
            </div>

            <div
              ref={transcriptContainerRef}
              className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
            >
              {lecture.status === "processing" && (
                <p className="text-sm italic text-white/50">
                  Transcript is being processed...
                </p>
              )}

              {transcriptUnavailable && (
                <p className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-200">
                  {lecture.transcriptError ||
                    "Transcript is unavailable for this lecture."}
                </p>
              )}

              {!transcriptSegments.length &&
                !transcriptUnavailable &&
                lecture.status !== "processing" && (
                  <p className="text-sm text-white/45">
                    No transcript is available yet.
                  </p>
                )}

              {filteredTranscript.map((segment) => (
                <div
                  key={segment.id}
                  ref={(element) => {
                    transcriptItemRefs.current[segment.id] = element;
                  }}
                  className={`rounded-lg p-3 text-sm leading-6 ${
                    activeTranscriptId === segment.id
                      ? "bg-indigo-200/10 text-cyan-100"
                      : "text-white/70"
                  }`}
                >
                  {segment.start !== null && (
                    <button
                      type="button"
                      onClick={() => seekTo(segment.start)}
                      className="mb-1 mr-2 rounded bg-white/10 px-2 py-0.5 text-xs text-indigo-200 hover:bg-white/20"
                      title={`Jump to ${formatTime(segment.start)}`}
                    >
                      {formatTime(segment.start)}
                    </button>
                  )}
                  {segment.text}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-[#192338] p-5">
            <div className="mb-4">
              <h2 className="font-semibold">Search lecture passages</h2>
              <p className="mt-1 text-sm text-white/50">
                Ask questions about the content of this lecture.
              </p>
            </div>

            <form onSubmit={handleAsk}>
              <label htmlFor="lecture-question" className="sr-only">
                Your question
              </label>
              <textarea
                id="lecture-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask something about this lecture..."
                rows={3}
                maxLength={2000}
                className="w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none placeholder:text-white/35 focus:border-indigo-300/50"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-white/35">
                  {question.length}/2000
                </span>
                <button
                  type="submit"
                  disabled={!question.trim() || chatLoading}
                  className="rounded-lg bg-indigo-200 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {chatLoading ? "Searching..." : "Find passage"}
                </button>
              </div>
            </form>

            {chatLoading && (
              <p className="mt-4 text-sm text-indigo-200" role="status">
                Finding matching passages…
              </p>
            )}

            {chatError && (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {chatError}
              </p>
            )}

            {answer && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="mb-2 text-sm font-semibold text-indigo-200">
                  Answer
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-white/80">
                  {answer}
                </p>

                {answerSources.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">
                      Sources
                    </h4>
                    <ul className="space-y-2">
                      {answerSources.map((source, index) => (
                        <li
                          key={source.id || source._id || index}
                          className="text-xs text-white/60"
                        >
                          {source.timestamp !== undefined &&
                            `At ${formatTime(Number(source.timestamp))} · `}
                          {source.text ||
                            source.content ||
                            source.title ||
                            `Source ${index + 1}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
