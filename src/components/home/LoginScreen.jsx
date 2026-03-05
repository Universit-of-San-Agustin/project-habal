import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff } from "lucide-react";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

const DEMO_ACCOUNTS = {
  Customer:   { email: "demo.customer@habal.app",   label: "🚖 Customer" },
  Rider:      { email: "demo.rider@habal.app",      label: "🏍 Rider" },
  Dispatcher: { email: "demo.dispatcher@habal.app", label: "📋 Dispatcher" },
  Operator:   { email: "demo.operator@habal.app",   label: "🏢 Operator" },
  Admin:      { email: "demo.admin@habal.app",      label: "🛡 Admin" },
};

export default function LoginScreen({ onLogin }) {
  const [screen, setScreen] = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    firstName: "", lastName: "", username: "", phone: "", dob: "",
    otp: ["", "", "", "", "", ""],
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleRealAuth = () => {
    setLoading(true);
    base44.auth.redirectToLogin(window.location.href);
  };

  const [demoLoading, setDemoLoading] = useState(null);
  const [demoError, setDemoError] = useState("");

  const handleDemoRole = async (roleName) => {
    const account = DEMO_ACCOUNTS[roleName];
    if (!account) return;
    setDemoLoading(roleName);
    setDemoError("");
    try {
      base44.auth.redirectToLogin(window.location.href + `?demo_email=${encodeURIComponent(account.email)}`);
    } catch {
      setDemoError("Could not redirect. Please log in manually.");
      setDemoLoading(null);
    }
  };

  // ── REGISTER ─────────────────────────────────────────────────
  if (screen === "register") {
    return (
      <AuthShell>
        <LogoHeader />
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Let's Get Started!</h2>
          <p className="text-gray-500 text-sm mt-1">Create an account to experience Habal!</p>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <AuthInput placeholder="First Name" value={form.firstName} onChange={v => set("firstName", v)} />
            <AuthInput placeholder="Last Name" value={form.lastName} onChange={v => set("lastName", v)} />
          </div>
          <AuthInput placeholder="Username" value={form.username} onChange={v => set("username", v)} />
          <AuthInput placeholder="Email" type="email" value={form.email} onChange={v => set("email", v)} />
          <AuthInput placeholder="Mobile Number" type="tel" value={form.phone} onChange={v => set("phone", v)} />
          <AuthInput placeholder="Password" type={showPass ? "text" : "password"} value={form.password} onChange={v => set("password", v)}
            suffix={<button onClick={() => setShowPass(p => !p)}>{showPass ? <EyeOff className="w-4 h-4 text-[#4DC8F0]" /> : <Eye className="w-4 h-4 text-[#4DC8F0]" />}</button>} />
          <AuthInput placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={v => set("confirmPassword", v)} />
          <AuthInput placeholder="Date of Birth mm/dd/yyyy" value={form.dob} onChange={v => set("dob", v)} />
        </div>
        <PrimaryBtn onClick={handleRealAuth} loading={loading} className="mt-5">Register</PrimaryBtn>
        <p className="text-center text-gray-500 text-sm mt-4">
          Already have an account?{" "}
          <button onClick={() => setScreen("login")} className="text-[#4DC8F0] font-semibold">Login Now!</button>
        </p>
      </AuthShell>
    );
  }

  // ── FORGOT PASSWORD ──────────────────────────────────────────
  if (screen === "forgot") {
    return (
      <AuthShell>
        <LogoHeader />
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Forgot Password</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your email address to reset</p>
        </div>
        <AuthInput placeholder="example@email.com" type="email" value={form.email} onChange={v => set("email", v)} />
        <PrimaryBtn onClick={() => setScreen("otp")} className="mt-4">Send Reset Link</PrimaryBtn>
        <p className="text-center text-gray-500 text-sm mt-4">
          <button onClick={() => setScreen("login")} className="text-[#4DC8F0] font-semibold">Back to Sign In</button>
        </p>
      </AuthShell>
    );
  }

  // ── OTP ──────────────────────────────────────────────────────
  if (screen === "otp") {
    return (
      <AuthShell>
        <LogoHeader />
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Verification Code</h2>
          <p className="text-gray-500 text-sm mt-2">We've sent a unique code to your email!</p>
          <p className="text-gray-400 text-xs mt-1">
            Didn't receive it?{" "}
            <button className="text-[#4DC8F0] font-medium">Resend</button>
          </p>
        </div>
        <div className="flex justify-center gap-2 mb-6">
          {form.otp.map((v, i) => (
            <input key={i} maxLength={1} value={v}
              onChange={e => {
                const arr = [...form.otp]; arr[i] = e.target.value;
                set("otp", arr);
                if (e.target.value && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
              }}
              id={`otp-${i}`}
              className="w-10 h-12 text-center text-gray-800 text-xl font-bold bg-[#f0faff] border-2 border-[#4DC8F0]/30 rounded-xl focus:outline-none focus:border-[#4DC8F0]"
            />
          ))}
        </div>
        <PrimaryBtn onClick={() => setScreen("otp_success")}>Continue</PrimaryBtn>
        <p className="text-center text-gray-500 text-sm mt-4">
          <button onClick={() => setScreen("login")} className="text-[#4DC8F0] font-semibold">Back to Sign In</button>
        </p>
      </AuthShell>
    );
  }

  // ── OTP SUCCESS ──────────────────────────────────────────────
  if (screen === "otp_success") {
    return (
      <AuthShell>
        <div className="flex flex-col items-center justify-center flex-1 py-12">
          <div className="w-24 h-24 rounded-full bg-[#4DC8F0]/10 flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-[#4DC8F0]/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#4DC8F0] flex items-center justify-center">
                <span className="text-white text-2xl">✓</span>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-2">Success!</h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            You have been successfully authenticated
          </p>
          <PrimaryBtn onClick={() => setScreen("new_password")} className="w-full">Continue</PrimaryBtn>
        </div>
      </AuthShell>
    );
  }

  // ── NEW PASSWORD ─────────────────────────────────────────────
  if (screen === "new_password") {
    return (
      <AuthShell>
        <LogoHeader />
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Set New Password</h2>
        </div>
        <div className="space-y-3">
          <AuthInput placeholder="Enter New Password" type="password" value={form.password} onChange={v => set("password", v)} label="New Password" />
          <AuthInput placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={v => set("confirmPassword", v)} label="Confirm New Password" />
        </div>
        <PrimaryBtn onClick={handleRealAuth} className="mt-5">Confirm</PrimaryBtn>
      </AuthShell>
    );
  }

  // ── LOGIN (default) ──────────────────────────────────────────
  return (
    <AuthShell>
      <LogoHeader />

      <div className="space-y-3 mt-2">
        <AuthInput label="Contact Number" placeholder="(+63) XX XXXX XXXX" type="tel" value={form.phone} onChange={v => set("phone", v)} />
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs text-gray-500 font-medium">Password</label>
            <button onClick={() => setScreen("forgot")} className="text-xs text-[#4DC8F0] hover:underline font-medium">Forgot Password?</button>
          </div>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-300 text-sm focus:outline-none focus:border-[#4DC8F0] focus:ring-2 focus:ring-[#4DC8F0]/20 transition-all"
            />
            <button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showPass ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      <PrimaryBtn onClick={handleRealAuth} loading={loading} className="mt-5">LOG IN</PrimaryBtn>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">Or sign in with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="flex justify-center gap-4 mb-4">
        <button onClick={handleRealAuth} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
          <span className="text-sm font-bold text-[#4285F4]">G</span>
        </button>
        <button onClick={handleRealAuth} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
          <span className="text-sm font-bold text-[#1877F2]">f</span>
        </button>
      </div>

      <p className="text-center text-gray-500 text-sm">
        Don't have an account?{" "}
        <button onClick={() => setScreen("register")} className="text-[#4DC8F0] font-semibold">Register Now!</button>
      </p>

      {/* Demo roles */}
      <div className="mt-6 border border-[#4DC8F0]/30 rounded-2xl p-4 bg-[#f0faff]/60">
        <p className="text-center text-xs text-[#4DC8F0] font-semibold uppercase tracking-widest mb-1">Try a Demo Role</p>
        <p className="text-center text-[10px] text-gray-400 mb-3">Click a role to log in as a demo account</p>
        {demoError && <p className="text-center text-xs text-red-400 mb-2">{demoError}</p>}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DEMO_ACCOUNTS).map(([roleName, account]) => (
            <button key={roleName} onClick={() => handleDemoRole(roleName)}
              disabled={demoLoading === roleName}
              className={`py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-[#4DC8F0]/30 bg-white hover:bg-[#4DC8F0]/10 hover:border-[#4DC8F0]/60 transition-all disabled:opacity-60 shadow-sm ${roleName === "Admin" ? "col-span-2" : ""}`}>
              {demoLoading === roleName
                ? <div className="w-4 h-4 border-2 border-[#4DC8F0]/30 border-t-[#4DC8F0] rounded-full animate-spin mx-auto" />
                : account.label}
            </button>
          ))}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-3">
          Password for all demo accounts: <span className="text-[#4DC8F0] font-mono font-bold">Demo@1234</span>
        </p>
      </div>
    </AuthShell>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────

function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto px-6 py-10 overflow-y-auto bg-white"
      style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
      `}</style>
      {/* Subtle top accent bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4DC8F0] to-[#38b2e8] z-10" />
      {children}
    </div>
  );
}

function LogoHeader() {
  return (
    <div className="flex flex-col items-center mb-6 pt-4">
      <div className="relative mb-3">
        <div className="absolute inset-0 rounded-full bg-[#4DC8F0]/15 scale-125" />
        <div className="relative w-20 h-20 rounded-full bg-[#f0faff] border-2 border-[#4DC8F0]/30 flex items-center justify-center shadow-md"
          style={{ boxShadow: "0 4px 20px rgba(77,200,240,0.2)" }}>
          <img src={HABAL_LOGO} alt="Habal" className="w-14 h-14 object-contain"
            onError={e => { e.target.style.display="none"; }} />
        </div>
      </div>
      <h1 className="text-xl font-bold text-gray-800 tracking-wide">Habal-Habal</h1>
      <p className="text-xs text-[#4DC8F0] font-medium mt-0.5">Your ride, your way</p>
    </div>
  );
}

function AuthInput({ label, placeholder, type = "text", value, onChange, suffix }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-500 font-medium mb-1.5">{label}</label>}
      <div className="relative">
        <input type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-300 text-sm focus:outline-none focus:border-[#4DC8F0] focus:ring-2 focus:ring-[#4DC8F0]/20 transition-all" />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, loading, className = "" }) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full py-3.5 rounded-full font-semibold text-white text-base transition-all disabled:opacity-60 ${className}`}
      style={{ background: "linear-gradient(135deg, #4DC8F0 0%, #38b2e8 100%)", boxShadow: "0 4px 20px rgba(77,200,240,0.35)" }}>
      {loading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" /> : children}
    </button>
  );
}

function SecondaryBtn({ children, onClick, className = "" }) {
  return (
    <button onClick={onClick}
      className={`w-full py-3.5 rounded-full font-medium text-[#4DC8F0] text-base bg-white border-2 border-[#4DC8F0]/40 hover:bg-[#f0faff] transition-all ${className}`}>
      {children}
    </button>
  );
}