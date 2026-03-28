import { useEffect, useRef } from "react";

export default function LoginPanel() {
  const orbRef = useRef(null);

  useEffect(() => {
    const orb = orbRef.current;
    if (!orb) return;

    let currentX = 0;
    let currentY = 0;

    const handleMove = (e) => {
      const rect = orb.getBoundingClientRect();

      const x = (e.clientX - rect.left - rect.width / 2) * 0.04;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.04;

      currentX += (x - currentX) * 0.1;
      currentY += (y - currentY) * 0.1;

      orb.style.transform =
        `rotateX(${currentY}deg) rotateY(${currentX}deg) scale(1.05)`;
    };

    const reset = () => {
      currentX = 0;
      currentY = 0;
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
        <h2 className="panel-headline">
          Learn smarter,<br />not harder
        </h2>
        <p className="panel-body">
          AI-powered lectures, quizzes, and analytics to boost your performance.
        </p>
      </div>

      {/* ORB (ADDED) */}
      <div className="panel-art login-art">
        <div className="ai-orb" ref={orbRef}>

          <div className="ai-ring"></div>
          <div className="ai-ring r2"></div>
          <div className="ai-ring r3"></div>

          <div className="ai-core"></div>

          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="ai-particle"
              style={{
                left: `${20 + i * 8}%`,
                animationDelay: `${i * 0.6}s`
              }}
            />
          ))}

        </div>
      </div>

    </div>
  );
}