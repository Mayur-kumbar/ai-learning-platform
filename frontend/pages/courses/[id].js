import api from "@/lib/api";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function CourseDetails() {
  const router = useRouter();
  const { id } = router.query;
  console.log("Course ID from URL:", id);

  const [course, setCourse] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data);
      } catch (error) {
        console.error("Error fetching course", error);
      }
    };

    fetchCourse();
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
            {console.log("Lecture data:", lecture)}
            {lecture.title}
          </div>
        ))}
      </div>

    </div>
  );
}