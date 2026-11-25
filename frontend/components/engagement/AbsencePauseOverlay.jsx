import { FOCUS_HOLD_MS } from "../../lib/engagementScoring";

const messages = {
  absent: "The camera could no longer locate a face",
  turned: "The camera estimated that your face was turned away",
  closed: "The camera estimated that both eyes were closed",
};

export default function AbsencePauseOverlay({ reason, onResume }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="focus-pause-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
        <h2 id="focus-pause-title" className="text-xl font-bold mb-2">Lecture paused</h2>
        <p className="text-white/75 mb-6">{messages[reason]} for {FOCUS_HOLD_MS[reason] / 1000} seconds.</p>
        <button autoFocus onClick={() => onResume()} className="w-full py-2 rounded bg-indigo-200 text-slate-950 font-semibold">Resume lecture</button>
        <button onClick={() => onResume(true)} className="mt-3 underline">Resume with tracking off</button>
      </div>
    </div>
  );
}
