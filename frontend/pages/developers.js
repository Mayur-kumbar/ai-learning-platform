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
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-10 py-6 backdrop-blur bg-[#0b0c10]/70 sticky top-0 z-50">
        <h1
          onClick={() => router.push("/")}
          className="text-xl font-semibold cursor-pointer"
        >
          ⬡ LearnX AI
        </h1>

        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-300 hover:text-white transition"
        >
          Home
        </button>
      </nav>

      {/* HEADER */}
      <section className="text-center mt-20 px-6">
        <h1 className="text-4xl font-bold">
          Meet the Developers
        </h1>
        <p className="mt-4 text-gray-400 max-w-xl mx-auto">
          The team behind LearnX AI — building intelligent learning experiences.
        </p>
      </section>

      {/* DEV CARDS */}
      <section className="mt-16 px-10 grid sm:grid-cols-2 md:grid-cols-4 gap-8">

        {devs.map((dev, i) => (
          <div
            key={i}
            className={`p-6 rounded-xl backdrop-blur text-center transition hover:scale-105 
              ${dev.highlight 
                ? "border border-[#f0c060] shadow-lg shadow-[#f0c060]/20 bg-white/5" 
                : "border border-white/10 bg-white/5"
              }`}
          >
            {/* Avatar */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f0c060]/20 flex items-center justify-center text-lg font-bold">
              {dev.name[0]}
            </div>

            {/* Name */}
            <h2 className="text-lg font-semibold">{dev.name}</h2>

            {/* Role */}
            <p className="text-[#f0c060] text-sm">{dev.role}</p>

            {/* Description */}
            <p className="mt-3 text-gray-400 text-sm">
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
      <footer className="mt-20 text-center text-gray-500 pb-10">
        © {new Date().getFullYear()} LearnX AI. All rights reserved.
      </footer>

    </div>
  );
}