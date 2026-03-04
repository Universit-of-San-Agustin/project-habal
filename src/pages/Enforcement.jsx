import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, Plus, AlertTriangle, XCircle, Ban } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";

export default function Enforcement() {
  const [strikes, setStrikes] = useState([]);
  const [riders, setRiders] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ target_type: "rider", target_id: "", target_name: "", reason: "", severity: "warning", notes: "" });

  const load = async () => {
    const [s, r, n] = await Promise.all([
      base44.entities.Strike.list("-created_date", 100),
      base44.entities.Rider.list(),
      base44.entities.Network.list(),
    ]);
    setStrikes(s);
    setRiders(r);
    setNetworks(n);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const targets = form.target_type === "rider" ? riders : networks;

  const handleSubmit = async () => {
    if (!form.target_id || !form.reason) return;
    await base44.entities.Strike.create({ ...form, issued_by: "admin" });
    // update strike count
    if (form.target_type === "rider") {
      const r = riders.find(x => x.id === form.target_id);
      if (r) await base44.entities.Rider.update(r.id, { strikes: (r.strikes || 0) + 1 });
    } else {
      const n = networks.find(x => x.id === form.target_id);
      if (n) await base44.entities.Network.update(n.id, { strikes: (n.strikes || 0) + 1 });
    }
    setShowForm(false);
    setForm({ target_type: "rider", target_id: "", target_name: "", reason: "", severity: "warning", notes: "" });
    load();
  };

  const severityIcon = (s) => {
    if (s === "ban") return <Ban className="w-4 h-4 text-red-400" />;
    if (s === "suspension") return <XCircle className="w-4 h-4 text-orange-400" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  };

  const topOffenders = [...riders]
    .filter(r => (r.strikes || 0) > 0)
    .sort((a, b) => (b.strikes || 0) - (a.strikes || 0))
    .slice(0, 5);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Enforcement</h1>
          <p className="text-gray-400 text-sm mt-0.5">Strikes, suspensions & governance actions</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Issue Strike
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Total Strikes", value: strikes.length, icon: AlertTriangle, color: "text-yellow-400" },
          { label: "Suspensions", value: strikes.filter(s => s.severity === "suspension").length, icon: XCircle, color: "text-orange-400" },
          { label: "Bans", value: strikes.filter(s => s.severity === "ban").length, icon: Ban, color: "text-red-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Strikes history */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300">Strike History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {["Target", "Type", "Severity", "Reason", "Date"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    {[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>)}
                  </tr>
                )) : strikes.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No strikes issued yet</td></tr>
                ) : strikes.map(s => (
                  <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-white">{s.target_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 capitalize">{s.target_type}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {severityIcon(s.severity)}
                        <StatusBadge status={s.severity} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 max-w-40 truncate">{s.reason}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.created_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top offenders */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Top Offenders (Riders)</h3>
          {topOffenders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No violations yet</div>
          ) : topOffenders.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <div className="text-sm text-white">{r.full_name}</div>
                <div className="text-xs text-gray-400">{r.network_name}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">{r.strikes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SLA table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-400" /> Performance SLA Standards
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {["Metric", "Definition", "Standard"].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Dispatch Speed", "Booking received → rider assigned", "≤ 2 minutes"],
                ["Acceptance Rate", "Bookings accepted by assigned riders", "≥ 70%"],
                ["Completion Rate", "Trips completed after acceptance", "≥ 85%"],
                ["Cancellation Rate", "Cancellations per network", "≤ 15%"],
                ["Customer Rating", "Average rating per network", "≥ 4.6 / 5.0"],
              ].map(([metric, def, standard]) => (
                <tr key={metric} className="border-b border-gray-800">
                  <td className="px-4 py-3 text-white font-medium">{metric}</td>
                  <td className="px-4 py-3 text-gray-400">{def}</td>
                  <td className="px-4 py-3 text-orange-400 font-mono font-medium">{standard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue strike modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Issue Strike / Sanction</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">Target Type</label>
                  <select value={form.target_type} onChange={e => { set("target_type", e.target.value); set("target_id", ""); set("target_name", ""); }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="rider">Rider</option>
                    <option value="network">Network</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">Target</label>
                  <select value={form.target_id} onChange={e => {
                    const t = targets.find(x => x.id === e.target.value);
                    set("target_id", e.target.value);
                    set("target_name", t?.full_name || t?.name || "");
                  }} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Select...</option>
                    {targets.map(t => <option key={t.id} value={t.id}>{t.full_name || t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Severity</label>
                <select value={form.severity} onChange={e => set("severity", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                  {["warning","strike","suspension","ban"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Reason *</label>
                <textarea value={form.reason} onChange={e => set("reason", e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-800">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">Issue Sanction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}