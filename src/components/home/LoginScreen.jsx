import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff } from "lucide-react";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/810dc0395_LOGOMAINBLUEBLACKWHITE.png";

const DEMO_ROLES = ["Customer", "Rider", "Dispatcher", "Operator", "Admin"];
const ROLE_MAP = {
  Customer: "user", Rider: "rider", Dispatcher: "dispatcher",
  Operator: "operator", Admin: "admin",
};

// screens: login | register | forgot | otp | otp_success | new_password
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

  const handleDemoRole = (role) => {
    onLogin({
      id: "demo-" + role.toLowerCase(),
      full_name: "Demo " + role,
      email: "demo." + role.toLowerCase() + "@habal.app",
      role: ROLE_MAP[role] || "user",
    });
  };

  // ── REGISTER ─────────────────────────────────────────────────
  if (screen === "register") {
    return (
      <AuthShell>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">Let's Get Started!</h2>
          <p className="text-blue-200 text-sm mt-1">Create an account to experience Habal!</p>
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
            suffix={<button onClick={() => setShowPass(p => !p)}>{showPass ? <EyeOff className="w-4 h-4 text-blue-300" /> : <Eye className="w-4 h-4 text-blue-300" />}</button>} />
          <AuthInput placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={v => set("confirmPassword", v)} />
          <AuthInput placeholder="Date of Birth mm/dd/yyyy" value={form.dob} onChange={v => set("dob", v)} />
        </div>
        <PrimaryBtn onClick={handleRealAuth} loading={loading} className="mt-5">Register</PrimaryBtn>
        <p className="text-center text-blue-200 text-sm mt-4">
          Already have an account?{" "}
          <button onClick={() => setScreen("login")} className="text-white font-semibold underline">Login Now!</button>
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
          <h2 className="text-xl font-bold text-white">Forgot Password</h2>
          <p className="text-blue-200 text-sm mt-1">Enter Email Address</p>
        </div>
        <AuthInput placeholder="example@email.com" type="email" value={form.email} onChange={v => set("email", v)} />
        <PrimaryBtn onClick={() => setScreen("otp")} className="mt-4">Send</PrimaryBtn>
        <p className="text-center text-blue-200 text-sm mt-4">
          <button onClick={() => setScreen("login")} className="text-white font-semibold underline">Back to Sign In</button>
        </p>
        <SecondaryBtn onClick={() => setScreen("register")} className="mt-2">Sign Up</SecondaryBtn>
      </AuthShell>
    );
  }

  // ── OTP ──────────────────────────────────────────────────────
  if (screen === "otp") {
    return (
      <AuthShell>
        <LogoHeader />
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">Enter Verification Code</h2>
          <p className="text-blue-200 text-sm mt-2">We've sent a unique code to your email!</p>
          <p className="text-blue-300 text-xs mt-1">
            If you didn't receive a code,{" "}
            <button className="text-white underline font-medium">Resend.</button>
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
              className="w-10 h-12 text-center text-white text-xl font-bold bg-white/10 border border-white/30 rounded-xl focus:outline-none focus:border-[#4DC8F0]" 
            />
          ))}
        </div>
        <PrimaryBtn onClick={() => setScreen("otp_success")}>Continue</PrimaryBtn>
        <p className="text-center text-blue-200 text-sm mt-4">
          Already have an account?{" "}
          <button onClick={() => setScreen("login")} className="text-white font-semibold underline">Sign In</button>
        </p>
        <SecondaryBtn onClick={() => setScreen("register")} className="mt-2">Sign Up</SecondaryBtn>
      </AuthShell>
    );
  }

  // ── OTP SUCCESS ──────────────────────────────────────────────
  if (screen === "otp_success") {
    return (
      <AuthShell>
        <div className="flex flex-col items-center justify-center flex-1 py-12">
          <div className="w-20 h-20 rounded-full bg-[#4DC8F0]/20 flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#4DC8F0]/30 flex items-center justify-center">
              <span className="text-3xl">✓</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
          <p className="text-blue-200 text-sm text-center mb-8">
            Congratulations! You have been successfully authenticated
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
          <h2 className="text-xl font-bold text-white">New Password</h2>
        </div>
        <div className="space-y-3">
          <AuthInput placeholder="Enter New Password" type="password" value={form.password} onChange={v => set("password", v)} label="New Password" />
          <AuthInput placeholder="example@email.com" type="password" value={form.confirmPassword} onChange={v => set("confirmPassword", v)} label="Confirm New Password" />
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
            <label className="text-xs text-blue-200 font-medium">Password</label>
            <button onClick={() => setScreen("forgot")} className="text-xs text-[#4DC8F0] hover:underline">Forgot Password?</button>
          </div>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 text-sm focus:outline-none focus:border-[#4DC8F0]"
            />
            <button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showPass ? <EyeOff className="w-4 h-4 text-blue-300" /> : <Eye className="w-4 h-4 text-blue-300" />}
            </button>
          </div>
        </div>
      </div>

      <PrimaryBtn onClick={handleRealAuth} loading={loading} className="mt-5">LOG IN</PrimaryBtn>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/20" />
        <span className="text-xs text-blue-300">Or sign up using</span>
        <div className="flex-1 h-px bg-white/20" />
      </div>

      <div className="flex justify-center gap-4 mb-4">
        <button onClick={handleRealAuth} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
          <span className="text-sm font-bold text-blue-600">G</span>
        </button>
        <button onClick={handleRealAuth} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
          <span className="text-sm font-bold text-blue-800">f</span>
        </button>
      </div>

      <p className="text-center text-blue-200 text-sm">
        Don't have an account?{" "}
        <button onClick={() => setScreen("register")} className="text-white font-semibold underline">Register Now!</button>
      </p>

      {/* Demo roles */}
      <div className="mt-6 border border-white/20 rounded-2xl p-4">
        <p className="text-center text-xs text-blue-300 font-medium uppercase tracking-widest mb-3">Try a Demo Role</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ROLES.map(role => (
            <button key={role} onClick={() => handleDemoRole(role)}
              className={`py-2 rounded-xl text-sm font-semibold text-white/80 border border-white/20 bg-white/10 hover:bg-white/20 transition-colors ${role === "Admin" ? "col-span-2" : ""}`}>
              {role}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────

function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto px-6 py-10 overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #1B2B6B 0%, #2563eb 100%)", fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      {children}
    </div>
  );
}

function LogoHeader() {
  return (
    <div className="flex flex-col items-center mb-6">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/810dc0395_LOGOMAINBLUEBLACKWHITE.png"
        alt="Habal" className="w-16 h-16 object-contain mb-2"
        onError={e => { e.target.style.display="none"; }} />
    </div>
  );
}

function AuthInput({ label, placeholder, type = "text", value, onChange, suffix }) {
  return (
    <div>
      {label && <label className="block text-xs text-blue-200 font-medium mb-1.5">{label}</label>}
      <div className="relative">
        <input type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 text-sm focus:outline-none focus:border-[#4DC8F0]" />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, loading, className = "" }) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full py-3.5 rounded-full font-semibold text-white text-base transition-all disabled:opacity-60 ${className}`}
      style={{ background: "#4DC8F0", boxShadow: "0 4px 15px rgba(77,200,240,0.4)" }}>
      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : children}
    </button>
  );
}

function SecondaryBtn({ children, onClick, className = "" }) {
  return (
    <button onClick={onClick}
      className={`w-full py-3.5 rounded-full font-medium text-gray-700 text-base bg-white border border-gray-200 hover:bg-gray-50 transition-all ${className}`}>
      {children}
    </button>
  );
}