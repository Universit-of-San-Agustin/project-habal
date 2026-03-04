import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Activity } from "lucide-react";

const EVENT_COLORS = {
  BOOKING_CREATED: "text-blue-400 bg-blue-500/10",
  BOOKING_ROUTED_TO_NETWORK: "text-indigo-400 bg-indigo-500/10",
  RIDER_ASSIGNED: "text-yellow-400 bg-yellow-500/10",
  RIDER_ACCEPTED: "text-green-400 bg-green-500/10",
  RIDER_DECLINED: "text-red-400 bg-red-500/10",
  RIDER_ARRIVED: "text-cyan-400 bg-cyan-500/10",
  TRIP_STARTED: "text-orange-400 bg-orange-500/10",
  TRIP_ENDED: "text-purple-400 bg-purple-500/10",
  COMPLETION_CONFIRMED: "text-green-400 bg-green-500/10",
  RATING_SUBMITTED: "text-yellow-400 bg-yellow-500/10",
  COMPLAINT_FILED: "text-red-400 bg-red-500/10",
  BOOKING_CANCELLED: "text-red-400 bg-red-500/10",
  BOOKING_REASSIGNED: "text-orange-400 bg-orange-500/10",
};

export default function AuditLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    base44.entities.BookingEvent.list("-created_date", 500).then(e => {
      setEvents(e);
      setLoading(false);
    });
  }, []);

  const eventTypes = ["All", ...Object.keys(EVENT_COLORS)];
  const filtered = events.filter(e => {
    const matchSearch = !search || e.booking_id?.includes(search) || e.actor_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || e.event_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-gray-400 text-sm mt-0.5">{events.length} events — append-only booking accountability trail</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by booking ID or actor..."
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
          {eventTypes.map(t => <option key={t} value={t}>{t === "All" ? "All Events" : t.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["Timestamp", "Event Type", "Booking ID", "Actor", "Role", "Details"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No events found</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(e.created_date).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${EVENT_COLORS[e.event_type] || "text-gray-400 bg-gray-500/10"}`}>
                      {e.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-orange-400">{e.booking_id?.slice(0, 12)}...</td>
                  <td className="px-4 py-3 text-sm text-white">{e.actor_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 capitalize">{e.actor_role || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-48 truncate">{e.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}