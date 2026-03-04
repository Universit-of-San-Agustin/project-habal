import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft } from "lucide-react";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/ae9f8141e_LOGOMAINBLUEBLACKWHITE.png";

const DEMO_ROLES = ["Customer", "Rider", "Dispatcher", "Operator", "Admin"];

// Demo role → app role mapping
const ROLE_MAP = {
  Customer: "user",
  Rider: "rider",
  Dispatcher: "dispatcher",
  Operator: "operator",
  Admin: "admin",
};

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleDemoRole = (role) => {
    // Simulate a demo user with that role and call onLogin with a fake user object
    const demoUser = {
      id: "demo-" + role.toLowerCase(),
      full_name: "Demo " + role,
      email: "demo." + role.toLowerCase() + "@habal.app",
      role: ROLE_MAP[role] || "user",
    };
    onLogin(demoUser);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Back button */}
      <div className="px-4 pt-12 pb-2">
        <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main form area */}
      <div className="flex-1 flex flex-col items-center px-6 pt-4">
        {/* Logo */}
        <img
          src={HABAL_LOGO}
          alt="Habal"
          className="w-16 h-16 object-contain mb-6"
        />

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-400 mb-8">Sign in to continue</p>

        {/* Email field */}
        <div className="w-full mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3.5 bg-gray-100 rounded-xl text-gray-900 text-sm placeholder-gray-400 border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Password field */}
        <div className="w-full mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
            <button className="text-xs text-emerald-500 font-medium hover:underline">Forgot password?</button>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-3.5 bg-gray-100 rounded-xl text-gray-900 text-sm placeholder-gray-400 border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-2xl transition-all disabled:opacity-60 flex items-center justify-center text-base"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : "Sign In"}
        </button>

        {/* Sign up */}
        <p className="mt-5 text-sm text-gray-500">
          Don't have an account?{" "}
          <button onClick={handleSignIn} className="text-emerald-500 font-semibold hover:underline">Sign up</button>
        </p>

        {/* Demo mode */}
        <div className="w-full mt-8 border border-amber-200 bg-amber-50 rounded-2xl p-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-amber-500 text-xs">⚠</span>
            <span className="text-xs text-amber-600 font-semibold uppercase tracking-widest">Demo Mode — Remove Before Production</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map(role => (
              <button
                key={role}
                onClick={() => handleDemoRole(role)}
                className={`py-2 rounded-xl border border-amber-200 text-sm font-medium text-amber-700 bg-white hover:bg-amber-50 transition-colors ${role === "Admin" ? "col-span-2" : ""}`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}