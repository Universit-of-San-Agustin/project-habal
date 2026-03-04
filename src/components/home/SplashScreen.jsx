import { useEffect, useState } from "react";

// Habal official logo from their repo (white bg, teal icon)
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/0385c3251_image.png";

export default function SplashScreen() {
  const [phase, setPhase] = useState("logo"); // logo | text | exit
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 600);
    const t2 = setTimeout(() => setPhase("exit"), 1800);
    const t3 = setTimeout(() => setVisible(false), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${phase === "exit" ? "opacity-0" : "opacity-100"}`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)",
            transition: "opacity 1.2s",
            opacity: phase === "logo" ? 0 : 1,
          }}
        />
      </div>

      {/* Logo */}
      <div
        className="relative z-10"
        style={{
          transform: phase === "logo" ? "scale(0.6) translateY(20px)" : "scale(1) translateY(0)",
          opacity: phase === "logo" ? 0 : 1,
          transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.6s",
        }}
      >
        <div
          className="absolute -inset-8 rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%)",
            filter: "blur(16px)",
            opacity: phase !== "logo" ? 1 : 0,
            transition: "opacity 0.8s 0.3s",
          }}
        />
        <img
          src={HABAL_LOGO}
          alt="Habal"
          className="relative w-24 h-24 object-contain drop-shadow-lg"
          onError={e => {
            e.target.style.display = "none";
          }}
        />
      </div>

      {/* Text */}
      <div
        className="relative z-10 mt-6 text-center"
        style={{
          opacity: phase === "text" || phase === "exit" ? 1 : 0,
          transform: phase === "text" || phase === "exit" ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s, transform 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Habal</h1>
        <p className="mt-1 text-sm text-gray-400">Iloilo Verified Rider Network</p>
      </div>

      {/* Loading dots */}
      <div
        className="relative z-10 mt-8 flex gap-1.5"
        style={{
          opacity: phase === "text" ? 1 : 0,
          transition: "opacity 0.3s 0.2s",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#10b981",
              animation: `bounce-dot 1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes bounce-dot {
          0%, 100% { transform: scale(0.8); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}