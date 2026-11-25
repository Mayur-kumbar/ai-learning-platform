import Brand from "@/components/Brand";
import { useRouter } from "next/router";

export default function Developers() {
  const router = useRouter();

  const devs = [
    {
      name: "Aditya Vernekar",
      role: "Frontend Developer",
      desc: "Built UI, animations, and user experience.",
      github: "https://github.com/adityav99",
      linkedin: "https://www.linkedin.com/in/aditya-vernekar99",
      highlight: true,
    },
    {
      name: "Mayur Kumbar",
      role: "Backend Developer",
      desc: "Handled APIs, authentication, and database.",
      github: "https://github.com/Mayur-kumbar",
      linkedin: "https://www.linkedin.com/in/mayur-kumbar-711b032b2",
      highlight: true,
    },
    {
      name: "Prajot Magadum",
      role: "UI/UX Designer",
      desc: "Designed layout and to maintain user flows.",
      github: "https://github.com/Prajot-Magadum",
      linkedin: "https://www.linkedin.com/in/prajot-magadum-7198b62b7",
      highlight: true,
    },
    {
      name: "Shravan Kadam",
      role: "Frontend Developer",
      desc: "Worked on integration and system architecture.",
      github: "https://github.com/shravan-kadam",
      linkedin: "https://www.linkedin.com/in/shravan-kadam-42a7732a2",
      highlight: true,
    },
  ];

  return (
    <div className="public-page">

      {/* NAVBAR */}
      <nav className="public-nav">
        <h1
          onClick={() => router.push("/")}
          className="text-xl font-semibold cursor-pointer"
        >
          <Brand />
        </h1>

        <button
          onClick={() => router.push("/")}
          className="btn-outline"
        >
          Home
        </button>
      </nav>

      {/* HEADER */}
      <section className="team-intro">
        <h1 className="text-4xl font-bold">
          Meet the Developers
        </h1>
        <p className="mt-4 text-slate-300 max-w-xl mx-auto">
          The team behind SmartLearn — building intelligent learning experiences.
        </p>
      </section>

      {/* DEV CARDS */}
      <section className="team-grid">

        {devs.map((dev, i) => (
          <div
            key={i}
            className="team-card"
          >
            {/* Avatar */}
            <div className="team-avatar">
              {dev.name[0]}
            </div>

            {/* Name */}
            <h2 className="text-lg font-semibold">{dev.name}</h2>

            {/* Role */}
            <p className="team-role">{dev.role}</p>

            {/* Description */}
            <p className="mt-3 text-slate-300 text-sm">
              {dev.desc}
            </p>

            {/* TEXT LINKS (GitHub + LinkedIn) */}
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <a
                href={dev.github}
                target="_blank"
                rel="noopener noreferrer"
                className="dev-link"
              >
                GitHub
              </a>

              <a
                href={dev.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="dev-link"
              >
                LinkedIn
              </a>
            </div>

          </div>
        ))}

      </section>

      {/* FOOTER */}
      <footer className="public-footer">
        © {new Date().getFullYear()} SmartLearn. All rights reserved.
      </footer>

    </div>
  );
}