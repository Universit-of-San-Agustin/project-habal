import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Eye, EyeOff, Lock, AlertTriangle, XCircle } from "lucide-react";
import AuditLogPanel from "./AuditLogPanel";

const SENSITIVE_PASSWORD = "2026";
const SESSION_KEY = "habal_sensitive_logs_auth";

// ── Access logger ─────────────────────────────────────────────
async function logAccess(user, action, details = "") {
  await base44.entities.AuditLog.create({
    log_type: "admin_action",
    action,
    actor_id: user?.id || user?.email || "unknown",
    actor_name: user?.full_name || "Admin",
    actor_role: "admin",
    target_type: "sensitive_logs",
    target_name: "Sensitive Logs Dashboard",
    details,
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

export default function SensitiveLogsGate({ user, onBack }) {
  // step: "confirm" | "password" | "granted"
  const [step, setStep] = useState("confirm");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef(null);

  // Check session auth on mount
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "granted") {
      setStep("granted");
    } else {
      logAccess(user, "SENSITIVE_LOGS_ATTEMPT", "Admin opened sensitive logs section");
    }
  }, []);

  // Focus password input when step changes
  useEffect(() => {
    if (step === "password") setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  const handleConfirm = () => setStep("password");

  const handleCancel = () => onBack?.();

  const handleVerify = async () => {
    if (!password) return;
    setVerifying(true);

    if (password === SENSITIVE_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "granted");
      await logAccess(user, "SENSITIVE_LOGS_ACCESS_GRANTED", "Successful password verification");
      setStep("granted");
    } else {
      await logAccess(user, "SENSITIVE_LOGS_FAILED_PASSWORD", "Incorrect password attempt");
      setError("Incorrect password. Access denied.");
    }
    setVerifying(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleVerify();
  };

  // ── Granted: show the actual logs ─────────────────────────
  if (step === "granted") {
    return (
      <div>
        {/* Confidential banner */}
        <div className="mx-4 mt-3 mb-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
            Confidential Data – Authorized Access Only
          </span>
        </div>
        <AuditLogPanel />
      </div>
    );
  }

  // ── Step 1: Confirmation warning ──────────────────────────
  if (step === "confirm") {
    return (
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-sm">
          {/* Header */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-6 pt-8 pb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white font-bold text-lg leading-tight">Sensitive Data Access</h2>
            <p className="text-orange-100 text-xs mt-1">Security confirmation required</p>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <p className="text-xs text-amber-800 leading-relaxed">
                You are about to access sensitive system data including{" "}
                <span className="font-bold">user activity logs, location history, and investigation records</span>.
                This information is protected and should only be accessed for authorized operational or investigation purposes.
              </p>
            </div>

            <div className="space-y-1 mb-5">
              {[
                "User activity logs",
                "Booking and trip logs",
                "Location history logs",
                "Communication logs",
                "Support and incident reports",
                "Admin audit logs",
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 text-center mb-4">
              Your access attempt will be logged and audited.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600">
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Password verification ────────────────────────
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 to-red-800 px-6 pt-8 pb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">Admin Verification</h2>
          <p className="text-red-200 text-xs mt-1">Step 2 of 2 – Password required</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 text-center mb-5 leading-relaxed">
            Enter the <span className="font-bold text-gray-800">Admin Security Password</span> to access Sensitive Logs.
          </p>

          {/* Password input */}
          <div className="relative mb-3">
            <input
              ref={inputRef}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="Security password"
              className="w-full px-4 py-3.5 pr-12 rounded-2xl border-2 text-sm font-mono text-gray-800 focus:outline-none transition-colors"
              style={{ borderColor: error ? "#ef4444" : "#e2e8f0", background: "#f8fafc" }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-600 font-semibold">{error}</span>
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center mb-4">
            This action will be recorded in the security audit log.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep("confirm"); setPassword(""); setError(""); }}
              className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={!password || verifying}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 bg-gradient-to-r from-red-600 to-red-800">
              {verifying ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : "Verify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}