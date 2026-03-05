import { useEffect, useState } from "react";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";
const PRIMARY = "#4DC8F0";

export default function SplashScreen() {
  const [phase, setPhase] = useState("in"); // in | show | out
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 200);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    const t3 = setTimeout(() => setVisible(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      style={{ opacity: phase === "out" ? 0 : 1, transition: "opacity 0.6s ease-in-out" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');

        @keyframes ring-pulse {
          0%   { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes logo-in {
          0%   { transform: scale(0.55); opacity: 0; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes dot-bounce {
          0%, 100% { transform: translateY(0);    opacity: 0.4; }
          50%       { transform: translateY(-6px); opacity: 1; }
        }
        .ring-1 { animation: ring-pulse 2s ease-out infinite; }
        .ring-2 { animation: ring-pulse 2s ease-out 0.35s infinite; }
        .ring-3 { animation: ring-pulse 2s ease-out 0.7s infinite; }
        .logo-enter { animation: logo-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Rings */}
      <div className="relative flex items-center justify-center">
        {phase === "show" && (
          <>
            <div className="ring-1 absolute w-44 h-44 rounded-full border-2"
              style={{ borderColor: `${PRIMARY}30` }} />
            <div className="ring-2 absolute w-44 h-44 rounded-full border"
              style={{ borderColor: `${PRIMARY}20` }} />
            <div className="ring-3 absolute w-44 h-44 rounded-full border"
              style={{ borderColor: `${PRIMARY}12` }} />
          </>
        )}

        {/* Logo circle */}
        <div className="logo-enter relative w-36 h-36 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, #f0faff 0%, #ddf3fc 100%)",
            boxShadow: `0 0 0 10px rgba(77,200,240,0.08), 0 12px 48px rgba(77,200,240,0.22)`,
          }}>
          <img src={HABAL_LOGO} alt="Habal" className="w-22 h-22 object-contain"
            style={{ width: 88, height: 88 }}
            onError={e => { e.target.style.display = "none"; }} />
        </div>
      </div>

      {/* Brand text */}
      <div
        className="mt-8 text-center"
        style={{
          opacity: phase === "show" ? 1 : 0,
          transform: phase === "show" ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.5s 0.25s, transform 0.5s 0.25s",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <p className="text-xl font-bold tracking-wide" style={{ color: "#1e293b" }}>Habal-Habal</p>
        <p className="text-xs font-medium mt-1 tracking-widest uppercase" style={{ color: PRIMARY }}>
          Your Ride, Your Way
        </p>
      </div>

      {/* Loading dots */}
      <div
        className="absolute bottom-14 flex gap-2.5"
        style={{
          opacity: phase === "show" ? 1 : 0,
          transition: "opacity 0.4s 0.5s",
        }}
      >
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full"
            style={{
              background: PRIMARY,
              animation: `dot-bounce 1.1s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}