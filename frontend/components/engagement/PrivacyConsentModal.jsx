export default function PrivacyConsentModal({ onAccept, onBehavioral, onDecline }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🎥</span>
          <h2 className="text-xl font-bold text-white">Enable Focus Tracking?</h2>
        </div>
        <div className="space-y-3 text-sm text-white/70 mb-6">
          <p>
            Optional camera assisted observations can produce a rough engagement estimate during this lecture. They do not measure attention, understanding, or learning.
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/60">
            <li>No video or photos are ever saved or uploaded.</li>
            <li>Video and facial landmarks stay on this device. Only brief derived estimates are sent to save lecture analytics.</li>
            <li>During playback, a sustained missing face, turned head or closed eyes can pause the lecture. You choose when to resume.</li>
            <li>Tracking pauses when playback pauses or this tab is hidden.</li>
            <li>Stop tracking at any time using the camera toggle.</li>
            <li>Refusing has no impact on your lecture access or grades.</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl bg-indigo-200 text-slate-950 font-semibold hover:bg-indigo-100 transition"
          >
            Enable Focus Tracking
          </button>
          <button
            onClick={onDecline}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            No Thanks
          </button>
        </div>
        <button
          type="button"
          onClick={onBehavioral}
          className="mt-3 w-full rounded-xl border border-white/15 py-2.5 text-sm text-white/80 hover:bg-white/10"
        >
          Use playback-only session summaries
        </button>
      </div>
    </div>
  );
}
