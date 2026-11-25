import Brand from "@/components/Brand";
import api from "@/lib/api";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function CourseDetails() {
  const router = useRouter();
  const { id } = router.query;
  console.log("Course ID from URL:", id);

  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data);
      } catch (error) {
        setError(error.message);
      }
    };

    fetchCourse();
  }, [id]);

  if (!course && error) return <p className="p-8" role="alert">{error}</p>;
  if (!course) {
    return <p className="text-white p-6">Loading...</p>;
  }

  return (
    <div className="course-page">
      <header className="course-brand"><Brand /></header>

      {/* TITLE */}
      <h1 className="text-3xl font-bold mb-6">
        {course.title}
      </h1>

      <p className="mb-4">{course.description}</p>
      {!course.enrolled && <button className="bg-blue-700 rounded text-white px-5 py-2 mb-4" onClick={async () => {
        try { await api.post(`/courses/${id}/enroll`); setCourse({ ...course, enrolled: true }); setError(''); }
        catch (err) { setError(err.message); }
      }}>Enroll in course</button>}
      {error && <p role="alert">{error}</p>}
      {/* LECTURES */}
      <div className="space-y-4">
        {course.lectures.map((lecture) => (
          <div
            key={lecture._id}
            onClick={() => course.enrolled && router.push(`/lectures/${lecture._id}`)}
            className="course-tile"
          >
            {!course.enrolled && "Enroll to open · "}
            {lecture.title}
          </div>
        ))}
      </div>

    </div>
  );
}