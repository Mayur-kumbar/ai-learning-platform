import { useAuth } from "../context/AuthContext";
import { mockLectures } from "../lib/mockData";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="p-10">
      <h1>Frontend Setup Complete 🚀</h1>

      <p className="mt-2">
        Auth status: {isAuthenticated ? "Logged In" : "Not Logged In"}
      </p>

      <h2 className="mt-5 font-bold">Mock Lectures:</h2>

      {mockLectures.map((lec) => (
        <div key={lec.id}>
          {lec.title} - {lec.status}
        </div>
      ))}
    </div>
  );
}