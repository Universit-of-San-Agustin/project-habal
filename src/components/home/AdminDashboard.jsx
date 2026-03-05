import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Network, MapPin, BarChart2, ShieldAlert, LogOut, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import ZoneManagement from "../admin/ZoneManagement";
import EnforcementPanel from "../admin/EnforcementPanel";
import AnalyticsDashboard from "../admin/AnalyticsDashboard";

const PRIMARY = "#4DC8F0";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function AdminDashboard({ user }) {
  const [tab, setTab] = useState("overview");
  const [networks, setNetworks] = useState([]);
  const [riders, setRiders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [nets, rdrs, bks] = await Promise.all([
      base44.entities.Network.list("-created_date", 50).catch(() => []),
      base44.entities.Rider.list("-created_date", 100).catch(() => []),
      base44.entities.Booking.list("-created_date", 50).catch(() => []),
    ]);
    setNetworks(nets || []);
    setRiders(rdrs || []);
    setBookings(bks || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approveNetwork = async (net) => {
    await base44.entities.Network.update(net.id, { status: "approved", verified_badge: true });
    load();
  };

  const suspendNetwork = async (net) => {
    await base44.entities.Network.update(net.id, { status: "suspended" });
    load();
  };

  const approveRider = async (rider) => {
    await base44.entities.Rider.update(rider.id, { status: "active" });
    load();
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "networks", label: "Networks", icon: <Network className="w-4 h-4" /> },
    { id: "riders", label: "Riders", icon: <Users className="w-4 h-4" /> },
    { id: "bookings", label: "Bookings", icon: <MapPin className="w-4 h-4" /> },
    { id: "zones", label: "Zones", icon: <MapPin className="w-4 h-4" /> },
    { id: "enforce", label: "Enforce", icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const pendingNetworks = networks.filter(n => n.status === "pending");
  const pendingRiders = riders.filter(r => r.status === "pending");
  const activeNetworks = networks.filter(n => n.status === "approved");
  const totalCompleted = bookings.filter(b => b.status === "completed").length;

  return (
    <div className="fixed inset-0 bg-white flex flex-col max-w-md mx-auto overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3 flex items-center justify-between"
        style={{ boxShadow: `0 4px 24px rgba(77,200,240,0.15)` }}>
        <div className="flex items-center gap-3">
          <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain" onError={e => { e.target.style.display="none"; }} />
          <div>
            <div className="text-xs font-medium" style={{ color: PRIMARY }}>Admin Panel</div>
            <div className="font-bold text-gray-900 text-sm">{user?.full_name}</div>
          </div>
        </div>
        <div className="flex gap-2">
          {(pendingNetworks.length > 0 || pendingRiders.length > 0) && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold bg-red-500">
              {pendingNetworks.length + pendingRiders.length}
            </div>
          )}
          <button onClick={load} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#EBF9FE" }}>
            <RefreshCw className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
          </button>
          <button onClick={() => base44.auth.logout(window.location.href)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <LogOut className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-shrink-0 flex flex-col items-center px-3 py-2.5 gap-0.5 text-[10px] font-medium transition-colors"
            style={tab === t.id ? { color: PRIMARY, borderBottom: `2px solid ${PRIMARY}` } : { color: "#9ca3af" }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading && <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} /></div>}

        {/* OVERVIEW */}
        {!loading && tab === "overview" && (
          <div className="px-4 pt-4 pb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Active Networks", value: activeNetworks.length, color: PRIMARY },
                { label: "Total Riders", value: riders.length, color: "#10b981" },
                { label: "Total Bookings", value: bookings.length, color: "#6366f1" },
                { label: "Completed Trips", value: totalCompleted, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: `0 2px 12px rgba(77,200,240,0.08)` }}>
                  <div className="text-xs text-gray-400 font-medium mb-1">{s.label}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {(pendingNetworks.length > 0 || pendingRiders.length > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" /> Action Required
                </div>
                {pendingNetworks.length > 0 && <p className="text-xs text-amber-600">{pendingNetworks.length} network(s) awaiting approval</p>}
                {pendingRiders.length > 0 && <p className="text-xs text-amber-600">{pendingRiders.length} rider(s) awaiting verification</p>}
              </div>
            )}
          </div>
        )}

        {/* NETWORKS */}
        {!loading && tab === "networks" && (
          <div className="px-4 pt-4 pb-6 space-y-3">
            {networks.length === 0 && <EmptyState icon={<Network className="w-10 h-10" />} label="No networks yet" />}
            {networks.map(n => (
              <div key={n.id} className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: `0 2px 10px rgba(77,200,240,0.07)` }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-1">
                      {n.name}
                      {n.verified_badge && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ background: PRIMARY }}>✓</span>}
                    </div>
                    <div className="text-xs text-gray-400">{n.zone} · {n.owner_name}</div>
                  </div>
                  <NetworkStatusPill status={n.status} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-3">
                  <span>Wallet: ₱{n.wallet_balance?.toLocaleString() || 0}</span>
                  <span>Strikes: {n.strikes || 0}</span>
                </div>
                {n.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => approveNetwork(n)} className="flex-1 py-2 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1" style={{ background: PRIMARY }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => suspendNetwork(n)} className="flex-1 py-2 rounded-xl text-red-500 text-sm font-semibold border border-red-200 flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
                {n.status === "approved" && (
                  <button onClick={() => suspendNetwork(n)} className="w-full py-2 rounded-xl text-red-500 text-sm font-medium border border-red-200">
                    Suspend Network
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* RIDERS */}
        {!loading && tab === "riders" && (
          <div className="px-4 pt-4 pb-6 space-y-2">
            {riders.map(r => (
              <div key={r.id} className="bg-white rounded-2xl px-4 py-3 border border-gray-100" style={{ boxShadow: `0 2px 8px rgba(77,200,240,0.06)` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: PRIMARY }}>
                    {r.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                    <div className="text-xs text-gray-400">{r.network_name} · {r.zone}</div>
                    <div className="text-xs text-gray-400">{r.plate_number || "No plate"}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "active" ? "bg-green-50 text-green-600" : r.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>{r.status}</span>
                    {r.status === "pending" && (
                      <button onClick={() => approveRider(r)} className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: PRIMARY }}>Approve</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BOOKINGS */}
        {!loading && tab === "bookings" && (
          <div className="px-4 pt-4 pb-6 space-y-2">
            {bookings.map(b => (
              <div key={b.id} className="bg-white rounded-2xl px-4 py-3 border border-gray-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono font-bold" style={{ color: PRIMARY }}>{b.booking_id}</span>
                  <NetworkStatusPill status={b.status} />
                </div>
                <div className="text-sm font-semibold text-gray-800">{b.customer_name}</div>
                <div className="text-xs text-gray-400 truncate">{b.pickup_address}</div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{b.rider_name || "Unassigned"}</span>
                  {b.fare_estimate && <span className="font-bold text-gray-700">₱{b.fare_estimate}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ZONES */}
        {!loading && tab === "zones" && <ZoneManagement />}

        {/* ANALYTICS */}
        {!loading && tab === "analytics" && <AnalyticsDashboard networks={networks} riders={riders} bookings={bookings} />}

        {/* ENFORCE */}
        {!loading && tab === "enforce" && <EnforcementPanel networks={networks} riders={riders} onRefresh={load} />}
      </div>
    </div>
  );
}

function NetworkStatusPill({ status }) {
  const map = {
    pending: "bg-amber-50 text-amber-600",
    approved: "bg-green-50 text-green-600",
    suspended: "bg-red-50 text-red-500",
    banned: "bg-red-100 text-red-700",
    completed: "bg-green-50 text-green-600",
    cancelled: "bg-red-50 text-red-500",
    assigned: "bg-blue-50 text-blue-600",
    otw: "bg-blue-50 text-blue-600",
    in_progress: "bg-purple-50 text-purple-600",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[status] || "bg-gray-50 text-gray-500"}`}>{status}</span>;
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center py-16 text-gray-200">
      {icon}
      <p className="text-sm text-gray-400 mt-2">{label}</p>
    </div>
  );
}