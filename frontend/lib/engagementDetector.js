import { useCallback, useEffect, useRef, useState } from "react";
import { estimateEngagement, createFocusMonitor, observeFace, smoothValue } from "./engagementScoring";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const WASM_URL = "/mediapipe/wasm";
const MODEL_URL = "/mediapipe/face_landmarker.task";
const inferEveryMs = 100;
const aggregateEveryMs = 2000;
const flushEveryMs = 30000;
const makeSessionId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

async function getLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const files = await FilesetResolver.forVisionTasks(WASM_URL);
  const create = delegate => FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO",
    numFaces: 2, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
  });
  try { return await create("GPU"); } catch { return create("CPU"); }
}

function flushBatch(samples, lectureId, sessionId) {
  if (!samples.length || !lectureId || typeof window === "undefined") return Promise.resolve(false);
  const token = localStorage.getItem("token");
  if (!token) return Promise.resolve(false);
  const batchId = `${sessionId}-${samples[0].observedAt}-${samples.at(-1).observedAt}`;
  return fetch(`${API_URL}/analytics/engagement/batch`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ lectureId, sessionId, batchId, samples }),
    keepalive: true,
  }).then((response) => response.ok).catch(() => false);
}

export function useEngagementDetection({ lectureId, isPlaying, isTabActive, enabled = false, mode = "camera", lectureTimestamp = 0, onFocusPause }) {
  const [score, setScore] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [modelStatus, setModelStatus] = useState("off");
  const [category, setCategory] = useState("disabled");
  const [cameraMessage, setCameraMessage] = useState("");
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const previewRef = useCallback(element => {
    if (videoRef.current) videoRef.current.srcObject = null;
    videoRef.current = element;
    if (element) element.srcObject = streamRef.current;
  }, []);
  const modelRef = useRef(null);
  const generationRef = useRef(0);
  const startingRef = useRef(false);
  const monitorRef = useRef(null);
  const queueRef = useRef([]);
  const busyRef = useRef(false);
  const flushingRef = useRef(false);
  const sessionRef = useRef({ lectureId, id: makeSessionId() });
  useEffect(() => { monitorRef.current = createFocusMonitor(); }, [lectureId, enabled, mode]);
  const latestRef = useRef({ lectureId, isPlaying, isTabActive, lectureTimestamp });
  useEffect(() => { latestRef.current = { lectureId, isPlaying, isTabActive, lectureTimestamp }; }, [lectureId, isPlaying, isTabActive, lectureTimestamp]);
  useEffect(() => {
    if (sessionRef.current.lectureId === lectureId) return;
    sessionRef.current = { lectureId, id: makeSessionId() };
    queueRef.current = [];
  }, [lectureId]);
  useEffect(() => {
    if (!lectureId) return;
    const key = `engagement-session:${lectureId}`;
    let id = null;
    try { id = sessionStorage.getItem(key); } catch { /* Storage may be unavailable. */ }
    if (!id) {
      id = makeSessionId();
      try { sessionStorage.setItem(key, id); } catch { /* Use an in-memory session. */ }
    }
    sessionRef.current = { lectureId, id };
  }, [lectureId]);

  const queueStorageKey = useCallback(() => `engagement-pending:${sessionRef.current.lectureId}:${sessionRef.current.id}`, []);
  const saveQueue = useCallback(() => {
    if (typeof localStorage === "undefined") return;
    try { localStorage.setItem(queueStorageKey(), JSON.stringify(queueRef.current.slice(-600))); } catch { /* Storage may be full or unavailable. */ }
  }, [queueStorageKey]);
  const flushPending = useCallback(async () => {
    if (flushingRef.current || !queueRef.current.length) return;
    flushingRef.current = true;
    try {
      const batch = queueRef.current.slice(0, 200);
      const accepted = await flushBatch(batch, sessionRef.current.lectureId, sessionRef.current.id);
      if (accepted) {
        queueRef.current.splice(0, batch.length);
        saveQueue();
      }
    } finally { flushingRef.current = false; }
  }, [saveQueue]);

  const stopCamera = useCallback(() => {
    generationRef.current++;
    startingRef.current = false;
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraMessage("");
    modelRef.current?.close?.();
    modelRef.current = null;

    setCameraActive(false);
    setModelStatus("off");
    setScore(null);
    setConfidence(0);
    setCategory("disabled");
    saveQueue();
    void flushPending();
  }, [flushPending, saveQueue]);

  const requestCamera = useCallback(async () => {
    if (streamRef.current || startingRef.current) return;
    startingRef.current = true;
    const generation = ++generationRef.current;
    setCameraError(null);
    setModelStatus("loading");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is not supported in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
      if (generation !== generationRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const track = stream.getVideoTracks()[0];
      track.onended = () => {
        if (generation !== generationRef.current) return;
        stopCamera(); setCameraError("Camera disconnected."); setModelStatus("unavailable");
      };
      if (generation !== generationRef.current) return;
      const model = await getLandmarker();
      if (generation !== generationRef.current) { model.close(); return; }
      modelRef.current = model;
      setCameraActive(true); setModelStatus("ready");
    } catch (error) {
      if (generation !== generationRef.current) return;
      stopCamera();
      setCameraError(error.name === "NotAllowedError" ? "Camera permission was denied." : error.message || "Camera or face model unavailable.");
      setModelStatus("unavailable");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!enabled || mode !== "camera" || !cameraActive || !isPlaying || !isTabActive) return undefined;
    const monitor = monitorRef.current;
    const values = [];
    let stopped = false;
    let lastFrame = -1;
    let lastAggregate = performance.now();
    try {
      const saved = localStorage.getItem(queueStorageKey());
      if (saved) queueRef.current = JSON.parse(saved).slice(-600);
    } catch { queueRef.current = []; }
    const timer = setInterval(() => {
      const video = videoRef.current;
      const track = streamRef.current?.getVideoTracks()[0];
      if (document.hidden || !track || track.muted || !track.enabled || track.readyState !== "live") {
        monitor.interrupt();
        setCameraMessage("Waiting for live camera frames");
        return;
      }
      if (stopped || busyRef.current || !modelRef.current || !video || video.readyState < 2 || video.currentTime === lastFrame) return;
      const frameTime = performance.now();
      if (frameTime - (video.__lastInference || 0) < inferEveryMs) return;
      video.__lastInference = frameTime; lastFrame = video.currentTime; busyRef.current = true;
      try {
        const face = observeFace(modelRef.current.detectForVideo(video, frameTime));
        const reason = monitor.observe(face.signal, frameTime);
        const remaining = monitor.secondsRemaining();
        const label = { absent: "No face visible", turned: "Face turned away", closed: "Eyes appear closed",
          present: "Face visible", unknown: "Face unclear" }[face.signal];
        setCameraMessage(remaining == null ? label : label + " · Pausing in " + remaining + "s");
        if (reason) onFocusPause(reason);
        values.push(face);
        if (frameTime - lastAggregate >= aggregateEveryMs) {
          const inputs = {};
          for (const key of ["facePresence", "visualOrientation", "headOrientation"]) {
            const valid = values.map(item => item[key]).filter(Number.isFinite);
            inputs[key] = valid.length ? valid.reduce((a,b) => a+b, 0) / valid.length : null;
          }
          const estimate = estimateEngagement(inputs);
          if (face.signal === "unknown" || face.signal === "absent") {
            estimate.score = null; estimate.confidence = 0; estimate.category = "insufficient";
          }
          values.length = 0;
          setScore(old => estimate.score == null ? null : smoothValue(old, estimate.score));
          setConfidence(estimate.confidence); setCategory(estimate.category);
          const now = Date.now();
          queueRef.current.push({ observedAt: now, lectureTimestamp: Math.round(latestRef.current.lectureTimestamp), durationSec: Math.min(10, Math.max(0, (performance.now() - lastAggregate) / 1000)), playbackActive: true, watchedDurationSec: Math.min(5, (performance.now() - lastAggregate) / 1000), score: estimate.score, confidence: estimate.confidence, facePresence: face.facePresence, tabVisible: document.visibilityState === "visible", mode: "camera", quality: face.signal });
          saveQueue();
          lastAggregate = performance.now();
        }
      } catch (error) { stopCamera(); setCameraError(error.message || "Face tracking failed."); setModelStatus("unavailable"); }
      finally { busyRef.current = false; }
    }, 50);
    const flushTimer = setInterval(async () => {
      void flushPending();
    }, flushEveryMs);
    return () => { stopped = true; monitor.interrupt(); clearInterval(timer); clearInterval(flushTimer); };
  }, [lectureId, enabled, mode, cameraActive, isPlaying, isTabActive, onFocusPause, stopCamera, flushPending, queueStorageKey, saveQueue]);

  useEffect(() => {
    if (!enabled || mode !== "behavioral") return undefined;
    try {
      const saved = localStorage.getItem(queueStorageKey());
      if (saved) queueRef.current = JSON.parse(saved).slice(-600);
    } catch { queueRef.current = []; }
    let lastSampleAt = performance.now();
    let lastAggregateAt = lastSampleAt;
    let watchDuration = 0;
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(5, Math.max(0, (now - lastSampleAt) / 1000));
      if (isPlaying && !document.hidden) watchDuration += elapsed;
      lastSampleAt = now;
      if (now - lastAggregateAt < aggregateEveryMs) return;
      const observedAt = Date.now();
      queueRef.current.push({ observedAt, lectureTimestamp: Math.round(latestRef.current.lectureTimestamp), durationSec: Math.min(10, (now - lastAggregateAt) / 1000), score: null, confidence: 0, facePresence: null, tabVisible: !document.hidden && isTabActive, mode: "behavioral", playbackActive: isPlaying, watchedDurationSec: isPlaying && !document.hidden ? Math.min(5, Math.max(0, (now - lastAggregateAt) / 1000)) : 0 });
      saveQueue();
      setScore(null); setConfidence(0); setCategory("insufficient");
      lastAggregateAt = now;
      void flushPending();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, mode, isPlaying, isTabActive, flushPending, queueStorageKey, saveQueue]);

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return undefined;
    const retry = window.setInterval(() => { void flushPending(); }, 10000);
    return () => window.clearInterval(retry);
  }, [enabled, mode, flushPending]);

  useEffect(() => () => stopCamera(), [stopCamera]);
  return { score, confidence, category, previewRef, cameraMessage, cameraActive, cameraError, modelStatus, requestCamera, stopCamera, hasCameraSupport: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia };
}
