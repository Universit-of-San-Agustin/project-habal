import { useEffect, useState } from "react";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function SplashScreen() {
  const [phase, setPhase] = useState("in"); // in | show | out
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 300);
    const t2 = setTimeout(() => setPhase("out"), 2200);
    const t3 = setTimeout(() => setVisible(false), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.6s ease-in-out",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes pulse-ring-1 {
          0% { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes pulse-ring-2 {
          0% { transform: scale(0.85); opacity: 0.35; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes splash-logo-in {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .splash-ring-1 { animation: pulse-ring-1 2s ease-out infinite; }
        .splash-ring-2 { animation: pulse-ring-2 2s ease-out 0.4s infinite; }
        .splash-logo { animation: splash-logo-in 0.55s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Subtle blue background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#4DC8F0]/8" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#4DC8F0]/6" />
        <div className="absolute top-1/3 right-0 w-48 h-48 rounded-full bg-[#4DC8F0]/5" />
      </div>

      <div className="relative flex items-center justify-center">
        {/* Animated pulse rings */}
        <div
          className="splash-ring-1 absolute w-40 h-40 rounded-full border-2 border-[#4DC8F0]/40"
          style={{ opacity: phase === "show" ? undefined : 0 }}
        />
        <div
          className="splash-ring-2 absolute w-40 h-40 rounded-full border border-[#4DC8F0]/25"
          style={{ opacity: phase === "show" ? undefined : 0 }}
        />

        {/* Logo container */}
        <div
          className="relative w-40 h-40 rounded-full flex items-center justify-center splash-logo"
          style={{
            background: "linear-gradient(135deg, #f0faff 0%, #e0f5fd 100%)",
            boxShadow: "0 0 0 8px rgba(77,200,240,0.1), 0 8px 40px rgba(77,200,240,0.2)",
          }}
        >
          <img
            src={HABAL_LOGO}
            alt="Habal"
            className="w-24 h-24 object-contain"
            onError={e => { e.target.style.display = "none"; }}
          />
        </div>
      </div>

      {/* Brand text */}
      <div
        className="mt-8 text-center"
        style={{
          opacity: phase === "show" ? 1 : 0,
          transform: phase === "show" ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.5s 0.3s, transform 0.5s 0.3s",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <p className="text-[#4DC8F0] text-sm font-semibold tracking-widest uppercase">Habal-Habal</p>
        <p className="text-gray-400 text-xs mt-1">Your ride, your way</p>
      </div>

      {/* Loading dots */}
      <div
        className="absolute bottom-16 flex gap-2"
        style={{
          opacity: phase === "show" ? 1 : 0,
          transition: "opacity 0.4s 0.5s",
        }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[#4DC8F0]"
            style={{
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(0.7);opacity:0.4} 50%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}