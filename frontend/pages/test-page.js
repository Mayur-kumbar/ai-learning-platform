import QuizComponent from "../components/QuizComponent";

export default function TestQuiz() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <QuizComponent lectureId="test123" />
    </div>
  );
}