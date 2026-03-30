import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { mockLectures } from "../lib/mockData";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* Upload Button (only instructor) */}
        {user?.role === "instructor" && (
          <button className="mb-6 bg-yellow-500 text-black px-4 py-2 rounded-lg">
            Upload Lecture
          </button>
        )}

        {/* Lecture Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {mockLectures.map((lecture) => (
            <div
              key={lecture.id}
              className="bg-gray-900 p-5 rounded-xl shadow"
            >
              <h2 className="text-xl font-semibold">{lecture.title}</h2>

              {/* Status Badge */}
              <span
                className={`inline-block mt-3 px-3 py-1 text-sm rounded-full ${
                  lecture.status === "done"
                    ? "bg-green-500"
                    : lecture.status === "processing"
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                }`}
              >
                {lecture.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}