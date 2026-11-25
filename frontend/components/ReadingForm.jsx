import { useState } from 'react';
import api from '@/lib/api';

export default function ReadingForm({ courseId, title, onCreated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await api.post(`/courses/${courseId}/lectures/reading`, {
        title, text: data.get('text'), topic: data.get('topic'), question: data.get('question'),
        options: data.getAll('option'), correctIndex: Number(data.get('key')), explanation: data.get('explanation'),
      });
      form.reset();
      await onCreated();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const field = 'block w-full mt-1 p-2 rounded bg-slate-800 border border-slate-600';
  return <form onSubmit={submit} className="space-y-3">
    <label className="block">Lesson text<textarea name="text" required rows={5} className={field}/></label>
    <label className="block">Assessed topic<input name="topic" required className={field}/></label>
    <label className="block">Knowledge check<input name="question" required className={field}/></label>
    {[1,2,3,4].map(number => <label key={number} className="block">Option {number}<input required name="option" className={field}/></label>)}
    <label className="block">Correct option<select name="key" className={field}>{[0,1,2,3].map(index => <option key={index} value={index}>{index+1}</option>)}</select></label>
    <label className="block">Explanation for revision<textarea required name="explanation" className={field}/></label>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy || !title.trim()} className="bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50">{busy ? 'Saving…' : 'Save reading and quiz'}</button>
  </form>;
}
