export default function ReEngagementPrompt({ visible, onRewind, onDismiss }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-24 right-6 z-40 w-72 bg-[#1e293b] border border-yellow-400/30 rounded-2xl p-5 shadow-2xl">
      <p className="text-sm font-semibold text-white mb-1">📖 Feeling lost?</p>
      <p className="text-xs text-white/60 mb-4">
        It looks like you may have lost focus. Would you like to rewind?
      </p>
      <div className="flex gap-2">
        <button
          onClick={onRewind}
          className="flex-1 py-2 rounded-lg bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-300 transition"
        >
          ⏪ Rewind 30s
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-2 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition"
        >
          I&apos;m fine
        </button>
      </div>
    </div>
  );
}
