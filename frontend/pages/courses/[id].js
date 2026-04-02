import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function CourseDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [course, setCourse] = useState(null);

  useEffect(() => {
    if (!id) return;

    // ✅ TEMP MOCK DATA (later from backend)
    const courses = [
      {
        _id: "1",
        title: "AI Mastery",
        lectures: [
          { _id: "l1", title: "Intro to AI" },
          { _id: "l2", title: "Search Algorithms" },
          { _id: "l3", title: "Neural Networks" },
        ],
      },
      {
        _id: "2",
        title: "Machine Learning Bootcamp",
        lectures: [
          { _id: "l1", title: "Linear Regression" },
          { _id: "l2", title: "Decision Trees" },
        ],
      },
    ];

    const selectedCourse = courses.find(c => c._id === id);
    setCourse(selectedCourse);
  }, [id]);

  if (!course) {
    return <p className="text-white p-6">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">

      {/* TITLE */}
      <h1 className="text-3xl font-bold mb-6">
        {course.title}
      </h1>

      {/* LECTURES */}
      <div className="space-y-4">
        {course.lectures.map((lecture) => (
          <div
            key={lecture._id}
            onClick={() => router.push(`/lectures/${lecture._id}`)}
            className="p-4 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20"
          >
            {lecture.title}
          </div>
        ))}
      </div>

    </div>
  );
}