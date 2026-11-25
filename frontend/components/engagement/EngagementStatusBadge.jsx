export default function EngagementStatusBadge({ score, enabled, mode, confidence = 0, category, cameraActive, cameraError, modelStatus, onToggle }) {
  const label = !cameraActive ? "Tracking off" : category === "insufficient" ? "Camera tracking on" : `${category || "estimated"} signals`;

  return (
    <button
      onClick={onToggle}
      title={cameraError || (cameraActive ? "Stop optional camera assisted estimates" : "Enable optional camera assisted estimates")}
      aria-label={enabled ? "Stop camera assisted engagement estimates" : "Enable camera assisted engagement estimates"}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-xs font-medium"
    >
      <span className={`w-2 h-2 rounded-full ${cameraActive ? "bg-cyan-400" : "bg-gray-500"}`} />
      {cameraActive ? (
        <span className="text-cyan-200">{label}{score != null && ` · ${Math.round(confidence * 100)}% evidence`}</span>
      ) : (
        <span className="text-gray-400">{modelStatus === "loading" ? "Starting camera…" : cameraError && enabled ? "Camera unavailable" : enabled && mode === "behavioral" ? "Playback only" : "Enable focus tracking"}</span>
      )}
      {score != null && <span className="text-white/40">{Math.round(score * 100)}% estimate</span>}
    </button>
  );
}
