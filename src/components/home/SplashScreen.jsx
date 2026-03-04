import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2.5;
      });
    }, 60);
    const fadeTimer = setTimeout(() => setFadeOut(true), 2400);
    return () => { clearInterval(interval); clearTimeout(fadeTimer); };
  }, []);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ background: "linear-gradient(160deg, #0f0f0f 0%, #1a0a00 50%, #0f0f0f 100%)" }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(249,115,22,0.15) 0%, transparent 70%)"
      }} />

      {/* Logo area */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo icon */}
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl"
            style={{ boxShadow: "0 0 60px rgba(249,115,22,0.4)" }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/abd424dd4_generated_image.png"
              alt="Habal Logo"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-3xl animate-ping opacity-20"
            style={{ background: "rgba(249,115,22,0.5)", animationDuration: "1.5s" }} />
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-5xl font-black text-white tracking-tight" style={{ letterSpacing: "-1px" }}>
            HABAL
          </h1>
          <p className="text-orange-400 text-sm font-medium tracking-widest uppercase mt-1">
            Moto · Iloilo
          </p>
        </div>

        {/* Tagline */}
        <p className="text-gray-400 text-sm text-center max-w-xs px-6">
          Verified riders. Safe rides. Every time.
        </p>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-3">
        <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-600 text-xs">Loading platform...</p>
      </div>

      {/* Version */}
      <div className="absolute bottom-6 text-gray-700 text-xs">v1.0.0 · Built for Iloilo City 🇵🇭</div>
    </div>
  );
}