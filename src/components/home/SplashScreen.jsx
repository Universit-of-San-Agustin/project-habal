import { useEffect, useState } from "react";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function SplashScreen() {
  const [phase, setPhase] = useState("in"); // in | out
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 2000);
    const t2 = setTimeout(() => setVisible(false), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(160deg, #1B2B6B 0%, #2563eb 100%)",
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.6s ease-in-out",
      }}
    >
      <div
        style={{
          transform: phase === "in" ? "scale(0.7)" : "scale(1)",
          opacity: phase === "in" ? 0 : 1,
          transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.5s",
        }}
        className="flex flex-col items-center"
      >
        <img
          src={HABAL_LOGO}
          alt="Habal"
          className="w-32 h-32 object-contain"
          onError={e => { e.target.style.display = "none"; }}
        />
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');`}</style>
    </div>
  );
}