import { useState } from "react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

const DEMO_ROLES = [
  { key: "customer",   label: "Customer",   emoji: "👤", color: "#4DC8F0" },
  { key: "rider",      label: "Rider",      emoji: "🏍", color: "#10b981" },
  { key: "dispatcher", label: "Dispatcher", emoji: "📋", color: "#3b82f6" },
  { key: "operator",   label: "Operator",   emoji: "🏢", color: "#8b5cf6" },
  { key: "admin",      label: "Admin",      emoji: "🛡️",  color: "#f59e0b" },
];

export default function DemoRoleSwitcher({ currentRole, onSwitch }) {
  const [open, setOpen] = useState(false);

  const current = DEMO_ROLES.find(r => r.key === currentRole) || DEMO_ROLES[0];

  return (
    <div className="fixed bottom-20 right-3 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
      {/* Role menu */}
      {open && (
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{ minWidth: 160 }}>
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Switch Demo Role</div>
          </div>
          {DEMO_ROLES.map(role => {
            const isActive = role.key === currentRole;
            return (
              <button
                key={role.key}
                onClick={() => { onSwitch(role.key); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                style={isActive ? { background: PRIMARY_BG } : {}}>
                <span className="text-base w-6 text-center">{role.emoji}</span>
                <span className="text-sm font-semibold flex-1" style={{ color: isActive ? PRIMARY_DARK : "#374151" }}>
                  {role.label}
                </span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="pointer-events-auto w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform active:scale-90"
        style={{
          background: open
            ? `linear-gradient(135deg, ${PRIMARY_DARK} 0%, #0e7ea3 100%)`
            : `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
          boxShadow: `0 4px 16px ${PRIMARY}60`,
        }}
        title="Switch Demo Role">
        <span className="text-base leading-none">{current.emoji}</span>
        <span className="text-white font-bold leading-none mt-0.5" style={{ fontSize: 8 }}>DEMO</span>
      </button>
    </div>
  );
}