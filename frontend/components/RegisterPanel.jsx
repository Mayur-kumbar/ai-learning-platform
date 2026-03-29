import { useEffect } from "react";



function RegisterPanel() {

  useEffect(() => {
    const orb = document.querySelector(".ai-orb");
    if (!orb) return;

    const handleMove = (e) => {
      const rect = orb.getBoundingClientRect();

      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      orb.style.transform =
        `rotateX(${y * 0.05}deg) rotateY(${x * 0.05}deg) scale(1.03)`;
    };

    const reset = () => {
      orb.style.transform = "rotateX(0) rotateY(0)";
    };

    orb.addEventListener("mousemove", handleMove);
    orb.addEventListener("mouseleave", reset);

    return () => {
      orb.removeEventListener("mousemove", handleMove);
      orb.removeEventListener("mouseleave", reset);
    };
  }, []);

  return (
    <div className="panel-content">

      {/* BRAND */}
      <div className="panel-brand">
        <span className="brand-mark">⬡</span>
        <span className="brand-name">Cognify</span>
      </div>

      {/* TEXT */}
      <div className="panel-copy">
        <h1 className="panel-headline">
          Learn smarter with <em>AI-powered insights</em>
        </h1>
        <p className="panel-body">
          Personalized learning, real-time feedback, and adaptive quizzes — all in one platform.
        </p>
      </div>

      {/* ORB */}
      <div className="panel-art register-art">
        <div className="ai-orb"></div>
      </div>

    </div>
  );
}

export default RegisterPanel;