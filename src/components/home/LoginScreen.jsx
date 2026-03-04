import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bike, MapPin, Shield, Star, ChevronRight } from "lucide-react";

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0f0f0f 0%, #1a0a00 60%, #0f0f0f 100%)" }}
    >
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 relative">
        {/* Glow */}
        <div className="absolute top-0 left-0 right-0 h-96 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(249,115,22,0.12) 0%, transparent 70%)"
        }} />

        {/* Logo */}
        <div className="relative mb-8 z-10">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl"
            style={{ boxShadow: "0 0 40px rgba(249,115,22,0.35)" }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/abd424dd4_generated_image.png"
              alt="Habal"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center z-10 mb-10">
          <h1 className="text-4xl font-black text-white mb-2" style={{ letterSpacing: "-1px" }}>
            Ride with <span className="text-orange-400">Habal</span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm">
            Iloilo's first verified motorcycle ride platform. Fast, safe, and accountable.
          </p>
        </div>

        {/* Feature pills */}
        <div className="z-10 flex flex-wrap gap-3 justify-center mb-10">
          {[
            { icon: Shield, label: "Verified Riders" },
            { icon: Star, label: "Rated Service" },
            { icon: MapPin, label: "Zone Dispatch" },
            { icon: Bike, label: "Fast Habal" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-gray-300 border border-gray-700 bg-gray-900/60">
              <Icon className="w-3.5 h-3.5 text-orange-400" />
              {label}
            </div>
          ))}
        </div>

        {/* Fare preview card */}
        <div className="z-10 w-full max-w-sm bg-gray-900/80 border border-gray-700/60 rounded-2xl p-4 backdrop-blur-sm mb-8">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Fare Preview</div>
          <div className="space-y-2">
            {[
              { label: "Base Fare", value: "₱40" },
              { label: "Per Kilometer", value: "₱10/km" },
              { label: "Zone Premium", value: "varies" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-orange-400 font-bold text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-10 space-y-3">
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-lg rounded-2xl transition-all disabled:opacity-60 shadow-lg"
          style={{ boxShadow: "0 4px 24px rgba(249,115,22,0.4)" }}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Bike className="w-5 h-5" />
              Get Started
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-gray-500 text-xs leading-relaxed px-4">
          By continuing, you agree to Habal's Terms of Service and Privacy Policy.
          Platform operates within Iloilo City only.
        </p>
      </div>
    </div>
  );
}