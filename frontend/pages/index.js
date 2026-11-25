import Image from "next/image";
import { BookOpen, ListChecks, ChartColumn } from "lucide-react";
import Brand from "@/components/Brand";
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
    <div className="public-page">

      {/* NAVBAR */}
      <nav className="public-nav">
        <h1
          onClick={() => router.push("/")}
          className="text-xl font-semibold tracking-wide cursor-pointer"
        >
          <Brand />
        </h1>

        <div className="public-links">
          <button
            onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-sm text-slate-300 hover:text-blue-300 transition"
          >
            Features
          </button>

          <button
            onClick={() => router.push("/developers")}
            className="text-sm text-slate-300 hover:text-blue-300 transition"
          >
            Developers
          </button>

          <button
            onClick={() => router.push("/login")}
            className="btn-outline"
          >
            Login
          </button>

          <button
            onClick={() => router.push("/register")}
            className="btn-primary"
          >
            Register
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="home-hero">

        <div className="hero-copy">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight fade-up">
          AI-powered learning{" "}
          <em>built for performance.</em>
        </h1>

        <p className="mt-6 text-lg text-slate-300 max-w-2xl fade-up">
          SmartLearn transforms the way you learn with adaptive lectures,
          intelligent quizzes, and real-time analytics.
        </p>

        <div className="mt-10 flex gap-4 fade-up">
          <button
            onClick={() => router.push("/register")}
            className="btn-primary"
          >
            Get Started
          </button>

          <button
            onClick={() => router.push("/login")}
            className="btn-outline"
          >
            Login
          </button>
        </div>
        </div>
        <div className="hero-art"><Image src="/study-desk.webp" alt="Geometry sketches, books and a blue prism on a sunlit desk" fill priority sizes="(min-width: 800px) 52vw, 100vw" /></div>
      </section>

      {/* FEATURES */}
      <section id="features" className="feature-grid">

        {[
          {
            icon: BookOpen, title: "AI Lectures",
            desc: "Personalized learning paths tailored to your strengths."
          },
          {
            icon: ListChecks, title: "Smart Quizzes",
            desc: "Adaptive testing that evolves with your progress."
          },
          {
            icon: ChartColumn, title: "Learning Analytics",
            desc: "Track performance with powerful insights and metrics."
          }
        ].map((item, i) => (
          <div
            key={i}
            className="feature-card fade-up"
          >
            <item.icon size={26} strokeWidth={1.6} aria-hidden="true" />
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-slate-300">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section">

        <h2 className="text-3xl font-bold fade-up">How It Works</h2>

        <div className="mt-10 grid md:grid-cols-3 gap-8">
          {[
            "Sign up and create your profile",
            "Get personalized AI learning content",
            "Track progress and improve continuously"
          ].map((step, i) => (
            <div key={i} className="fade-up text-slate-300">
              <div className="text-blue-300 text-2xl font-bold mb-2">
                {i + 1}
              </div>
              {step}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="public-cta">

        <h2 className="text-3xl font-bold fade-up">
          Start Learning Smarter Today
        </h2>

        <button
          onClick={() => router.push("/register")}
          className="btn-primary"
        >
          Create Account
        </button>
      </section>

      {/* FOOTER */}
      <footer className="public-footer fade-up">
        © {new Date().getFullYear()} SmartLearn. All rights reserved.
      </footer>

    </div>
  );
}