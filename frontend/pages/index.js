import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const elements = document.querySelectorAll(".fade-up");

    elements.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(30px)";

      setTimeout(() => {
        el.style.transition = "all 0.8s ease";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, i * 120);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white overflow-x-hidden">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-10 py-6 fade-up backdrop-blur bg-[#0b0c10]/70 sticky top-0 z-50">
        <h1
          onClick={() => router.push("/")}
          className="text-xl font-semibold tracking-wide cursor-pointer"
        >
          ⬡ LearnX AI
        </h1>

        <div className="flex gap-6 items-center">
          <button
            onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-sm text-gray-300 hover:text-white transition"
          >
            Features
          </button>

          <button
            onClick={() => router.push("/developers")}
            className="text-sm text-gray-300 hover:text-white transition"
          >
            Developers
          </button>

          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition"
          >
            Login
          </button>

          <button
            onClick={() => router.push("/register")}
            className="px-4 py-2 bg-[#f0c060] text-black rounded-lg hover:scale-105 transition"
          >
            Register
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center text-center mt-24 px-6 relative">

        {/* ORB GLOW */}
        <div className="absolute w-[500px] h-[500px] bg-[#f0c060]/10 blur-3xl rounded-full animate-pulse"></div>

        <h1 className="text-5xl md:text-6xl font-bold leading-tight fade-up">
          AI-Powered Learning <br />
          <span className="text-[#f0c060]">Built for Performance</span>
        </h1>

        <p className="mt-6 text-lg text-gray-400 max-w-2xl fade-up">
          Cognify transforms the way you learn with adaptive lectures,
          intelligent quizzes, and real-time analytics.
        </p>

        <div className="mt-10 flex gap-4 fade-up">
          <button
            onClick={() => router.push("/register")}
            className="px-6 py-3 bg-[#f0c060] text-black rounded-xl font-medium hover:scale-105 transition"
          >
            Get Started
          </button>

          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 border border-white/20 rounded-xl hover:bg-white/10 transition"
          >
            Login
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mt-32 px-10 grid md:grid-cols-3 gap-8">

        {[
          {
            title: "🧠 AI Lectures",
            desc: "Personalized learning paths tailored to your strengths."
          },
          {
            title: "⚡ Smart Quizzes",
            desc: "Adaptive testing that evolves with your progress."
          },
          {
            title: "📊 Deep Analytics",
            desc: "Track performance with powerful insights and metrics."
          }
        ].map((item, i) => (
          <div
            key={i}
            className="fade-up p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur hover:scale-105 hover:border-[#f0c060]/40 transition"
          >
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-gray-400">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-32 px-10 text-center">

        <h2 className="text-3xl font-bold fade-up">How It Works</h2>

        <div className="mt-10 grid md:grid-cols-3 gap-8">
          {[
            "Sign up and create your profile",
            "Get personalized AI learning content",
            "Track progress and improve continuously"
          ].map((step, i) => (
            <div key={i} className="fade-up text-gray-400">
              <div className="text-[#f0c060] text-2xl font-bold mb-2">
                {i + 1}
              </div>
              {step}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mt-32 text-center px-6">

        <h2 className="text-3xl font-bold fade-up">
          Start Learning Smarter Today
        </h2>

        <button
          onClick={() => router.push("/register")}
          className="mt-6 px-8 py-3 bg-[#f0c060] text-black rounded-xl hover:scale-105 transition"
        >
          Create Account
        </button>
      </section>

      {/* FOOTER */}
      <footer className="mt-24 text-center text-gray-500 pb-10 fade-up">
        © {new Date().getFullYear()} LearnX AI. All rights reserved.
      </footer>

    </div>
  );
}