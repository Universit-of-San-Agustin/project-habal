import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Send, BarChart2, ShieldAlert, LogOut, RefreshCw, CheckCircle, XCircle, MapPin, Star, MessageCircle } from "lucide-react";
import { useToast, ToastContainer } from "./ToastNotification";
import ChatPanel from "../chat/ChatPanel";
import LiveRiderMap from "./LiveRiderMap";

const PRIMARY = "#4DC8F0";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function NetworkOwnerDashboard({ user }) {
  const [tab, setTab] = useState("bookings");
  const [network, setNetwork] = useState(null);
  const [riders, setRiders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const knownBookingIds = useRef(new Set());
  const knownAssignments = useRef(new Set());
  const pollRef = useRef(null);
  const { toasts, addToast, dismiss } = useToast();

  const load = async () => {
    const nets = await base44.entities.Network.filter({ owner_email: user?.email }, "-created_date", 1).catch(() => []);
    const net = nets?.[0];
    setNetwork(net);
    if (net) {
      const [rdrs, bks] = await Promise.all([
        base44.entities.Rider.filter({ network_id: net.id }, "-created_date", 50).catch(() => []),
        base44.entities.Booking.filter({ network_id: net.id }, "-created_date", 30).catch(() => []),
      ]);
      const newBks = bks || [];
      if (knownBookingIds.current.size > 0) {
        newBks.forEach(b => {
          if (!knownBookingIds.current.has(b.id)) {
            addToast({ type: "rider", title: "New Booking", message: `${b.customer_name} needs a rider` });
          }
          // Detect new rider assignments
          if (b.rider_name && !knownAssignments.current.has(b.id)) {
            knownAssignments.current.add(b.id);
            addToast({ type: "success", title: "Rider Assigned", message: `${b.rider_name} assigned to ${b.customer_name}` });
          }
        });
      }
      newBks.forEach(b => { knownBookingIds.current.add(b.id); if (b.rider_name) knownAssignments.current.add(b.id); });
      setRiders(rdrs || []);
      setBookings(newBks);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 8000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  const [chatBooking, setChatBooking] = useState(null);
  const [trackingBooking, setTrackingBooking] = useState(null);

  const tabs = [
    { id: "bookings", label: "Bookings", icon: <Send className="w-4 h-4" /> },
    { id: "roster", label: "Roster", icon: <Users className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "compliance", label: "Compliance", icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const completed = bookings.filter(b => b.status === "completed").length;
  const cancelled = bookings.filter(b => b.status === "cancelled").length;
  const avgRating = bookings.filter(b => b.customer_rating).length
    ? (bookings.filter(b => b.customer_rating).reduce((a, b) => a + b.customer_rating, 0) / bookings.filter(b => b.customer_rating).length).toFixed(1)
    : "—";

  return (
    <div className="fixed inset-0 bg-white flex flex-col max-w-md mx-auto overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {chatBooking && <ChatPanel bookingId={chatBooking.booking_id || chatBooking.id} currentUser={user} senderRole="network_owner" onClose={() => setChatBooking(null)} />}
      {trackingBooking && <LiveRiderMap booking={trackingBooking} onClose={() => setTrackingBooking(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3" style={{ boxShadow: `0 2px 20px rgba(77,200,240,0.12)` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain" onError={e => { e.target.style.display="none"; }} />
            <div>
              <div className="text-xs text-gray-400 font-medium">Network Owner</div>
              <div className="font-bold text-gray-900 text-sm">{user?.full_name}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#EBF9FE" }}>
              <RefreshCw className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
            </button>
            <button onClick={() => base44.auth.logout(window.location.href)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <LogOut className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
        {network && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{network.name}</span>
            {network.verified_badge && <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: PRIMARY }}>✓ Verified</span>}
            {network.zone && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />{network.zone}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-shrink-0 flex flex-col items-center px-4 py-2.5 gap-0.5 text-[11px] font-medium transition-colors"
            style={tab === t.id ? { color: PRIMARY, borderBottom: `2px solid ${PRIMARY}` } : { color: "#9ca3af" }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading && <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} /></div>}

        {!loading && !network && (
          <div className="flex flex-col items-center py-20 px-6 text-center">
            <ShieldAlert className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium">No network found</p>
            <p className="text-sm text-gray-400 mt-1">Your account isn't linked to a network yet.</p>
          </div>
        )}

        {/* BOOKINGS */}
        {!loading && network && tab === "bookings" && (
          <div className="px-4 pt-4 pb-6 space-y-3">
            {bookings.length === 0 && <EmptyState icon={<Send className="w-10 h-10" />} label="No bookings yet" />}
            {bookings.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: `0 2px 10px rgba(77,200,240,0.08)` }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono font-bold" style={{ color: PRIMARY }}>{b.booking_id}</span>
                  <StatusPill status={b.status} />
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">{b.customer_name}</div>
                <div className="text-xs text-gray-400 truncate mb-0.5">📍 {b.pickup_address}</div>
                <div className="text-xs text-gray-400 truncate mb-2">→ {b.dropoff_address}</div>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{b.rider_name || "Unassigned"}</span>
                  <div className="flex items-center gap-2">
                    {b.zone && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{b.zone}</span>}
                    {b.fare_estimate && <span className="font-bold text-gray-700">₱{b.fare_estimate}</span>}
                    {b.rider_name && (
                      <div className="flex gap-1">
                        <button onClick={() => setTrackingBooking(b)}
                          className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-white text-[10px]"
                          style={{ background: "#10b981" }}>
                          📍 Track
                        </button>
                        <button onClick={() => setChatBooking(b)}
                          className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-white text-[10px]"
                          style={{ background: PRIMARY }}>
                          <MessageCircle className="w-3 h-3" /> Chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ROSTER */}
        {!loading && network && tab === "roster" && (
          <div className="px-4 pt-4 pb-6 space-y-2">
            <div className="text-xs text-gray-400 font-medium mb-2">{riders.length} / {network.active_rider_seats || 30} seats used</div>
            {riders.length === 0 && <EmptyState icon={<Users className="w-10 h-10" />} label="No riders in roster" />}
            {riders.map(r => (
              <div key={r.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: PRIMARY }}>
                  {r.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                  <div className="text-xs text-gray-400">{r.plate_number || "No plate"} · {r.motorcycle_make} {r.motorcycle_model}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RiderStatusDot status={r.online_status} />
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${r.status === "active" ? "bg-green-50 text-green-600" : r.status === "suspended" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ANALYTICS */}
        {!loading && network && tab === "analytics" && (
          <div className="px-4 pt-4 pb-6 space-y-3">
            {[
              { label: "Total Bookings", value: bookings.length, color: PRIMARY },
              { label: "Completed", value: completed, color: "#10b981" },
              { label: "Cancelled", value: cancelled, color: "#ef4444" },
              { label: "Avg Rating", value: avgRating, color: "#f59e0b" },
              { label: "Wallet Balance", value: `₱${network.wallet_balance?.toLocaleString() || 0}`, color: "#6366f1" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl px-5 py-4 border border-gray-100 flex justify-between items-center" style={{ boxShadow: `0 2px 10px rgba(77,200,240,0.07)` }}>
                <span className="text-sm text-gray-500">{s.label}</span>
                <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* COMPLIANCE */}
        {!loading && network && tab === "compliance" && (
          <div className="px-4 pt-4 pb-6 space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Network KPIs</div>
              {[
                { label: "Dispatch Speed", target: "≤ 2 min", status: "ok" },
                { label: "Acceptance Rate", target: "≥ 70%", status: "ok" },
                { label: "Completion Rate", target: "≥ 85%", value: completed && bookings.length ? `${Math.round(completed/bookings.length*100)}%` : "—", status: "ok" },
                { label: "Cancellation Rate", target: "≤ 15%", value: cancelled && bookings.length ? `${Math.round(cancelled/bookings.length*100)}%` : "—", status: "ok" },
                { label: "Avg Customer Rating", target: "≥ 4.6", value: avgRating, status: "ok" },
              ].map(k => (
                <div key={k.label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm text-gray-800 font-medium">{k.label}</div>
                    <div className="text-xs text-gray-400">Target: {k.target}</div>
                  </div>
                  <div className="text-sm font-bold" style={{ color: PRIMARY }}>{k.value || "—"}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Strikes</div>
              <div className="text-2xl font-black text-red-500">{network.strikes || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Network-level strikes</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: "bg-amber-50 text-amber-600",
    assigned: "bg-blue-50 text-blue-600",
    completed: "bg-green-50 text-green-600",
    cancelled: "bg-red-50 text-red-500",
    otw: "bg-blue-50 text-blue-600",
    in_progress: "bg-purple-50 text-purple-600",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[status] || "bg-gray-50 text-gray-500"}`}>{status}</span>;
}

function RiderStatusDot({ status }) {
  const c = status === "online" ? "bg-green-400" : status === "on_trip" ? "bg-blue-400" : "bg-gray-300";
  return <div className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${c}`} /><span className="text-[10px] text-gray-400">{status}</span></div>;
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center py-16 text-gray-200">
      {icon}
      <p className="text-sm text-gray-400 mt-2">{label}</p>
    </div>
  );
}