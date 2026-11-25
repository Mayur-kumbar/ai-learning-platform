import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function LearningOverview({ user, instructor = false }) {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    api.get('/courses/learning', {signal: controller.signal})
      .then(({data}) => { if (!controller.signal.aborted) setCourses(data.courses); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [user?.id]);
  if (error) return <p role="alert">{error}</p>;
  if (!courses) return <p>Loading courses…</p>;
  if (!courses.length) return instructor ? <Link href="/instructor/courses">Create your first course</Link> : <Link href="/courses">Explore courses to enroll</Link>;
  return <div className="space-y-4">{courses.map(course =>
    <section key={course.id} className="rounded-lg border border-slate-700 p-4">
      <Link className="font-semibold underline" href={instructor ? `/instructor/courses/${course.id}` : `/courses/${course.id}`}>{course.title}</Link>
      {instructor ? <>
        <p>{course.published ? 'Published' : 'Draft'} · {course.enrollmentCount} enrolled · {course.assessedLearners} assessed</p>
        <p>{course.attemptCount} attempts · Latest assessment average: {course.averageScore == null ? 'Awaiting submissions' : course.averageScore + '%'}</p>
      </> : <>
        <p>{course.completed} of {course.lectures.length} lectures completed</p>
        {course.lectures.map(lecture => <div key={lecture.id} className="mt-3">
          <Link href={`/lectures/${lecture.id}`} className="text-blue-300 underline">{lecture.title}</Link>
          <p>{lecture.latestScore == null ? 'Assessment pending' : 'Latest score: ' + lecture.latestScore + '%'}{lecture.completed && ' · Completed'}</p>
          {lecture.revision.map((item,index) => <div key={index} className="mt-2 rounded bg-slate-800 p-3">
            <strong>Revise {item.topic || lecture.title}</strong><p>{item.question}</p><p>{item.explanation}</p>
            <Link className="underline" href={`/lectures/${lecture.id}`}>Review lecture and retake quiz</Link>
          </div>)}
        </div>)}
      </>}
    </section>)}</div>;
}
