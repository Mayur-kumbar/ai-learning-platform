import ProtectedRoute from "../components/ProtectedRoute";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <div className="p-10">
        <h1>Dashboard Page 🔐</h1>
        <p>You are logged in!</p>
      </div>
    </ProtectedRoute>
  );
}