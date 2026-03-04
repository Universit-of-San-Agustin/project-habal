import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Filter } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import BookingModal from "../components/bookings/BookingModal";
import BookingDetailPanel from "../components/bookings/BookingDetailPanel";

const ZONES = ["All", "Jaro", "Mandurriao", "City Proper", "La Paz", "Arevalo"];
const STATUSES = ["All", "pending", "searching", "assigned", "otw", "arrived", "in_progress", "completed", "cancelled"];

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const [b, n, r] = await Promise.all([
      base44.entities.Booking.list("-created_date", 200),
      base44.entities.Network.filter({ status: "approved" }),
      base44.entities.Rider.filter({ status: "active" }),
    ]);
    setBookings(b);
    setNetworks(n);
    setRiders(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = bookings.filter(b => {
    const matchSearch = !search || b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_id?.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_address?.toLowerCase().includes(search.toLowerCase());
    const matchZone = zoneFilter === "All" || b.zone === zoneFilter;
    const matchStatus = statusFilter === "All" || b.status === statusFilter;
    return matchSearch && matchZone && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-gray-400 text-sm mt-0.5">{bookings.length} total bookings</p>
        </div>
        <button
          onClick={() => { setSelected(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bookings..."
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={zoneFilter}
          onChange={e => setZoneFilter(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500"
        >
          {ZONES.map(z => <option key={z}>{z}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s === "All" ? "All Status" : s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["Booking ID", "Customer", "Pickup → Dropoff", "Zone", "Network", "Rider", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No bookings found</td></tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id} className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => setSelected(b)}>
                    <td className="px-4 py-3 text-xs font-mono text-orange-400">{b.booking_id || b.id?.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-medium">{b.customer_name}</div>
                      <div className="text-xs text-gray-400">{b.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <div className="text-xs text-gray-300 truncate">{b.pickup_address}</div>
                      <div className="text-xs text-gray-500 truncate">→ {b.dropoff_address}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">{b.zone}</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{b.network_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-300">{b.rider_name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); setSelected(b); }}
                        className="text-xs text-orange-400 hover:text-orange-300">Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <BookingModal
          networks={networks}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            const bookingId = "BK-" + Date.now().toString(36).toUpperCase();
            const booking = await base44.entities.Booking.create({ ...data, booking_id: bookingId, status: "pending" });
            await base44.entities.BookingEvent.create({
              booking_id: booking.id,
              event_type: "BOOKING_CREATED",
              actor_role: "customer",
              actor_name: data.customer_name,
              timestamp: new Date().toISOString(),
            });
            setShowModal(false);
            load();
          }}
        />
      )}

      {selected && (
        <BookingDetailPanel
          booking={selected}
          riders={riders}
          onClose={() => setSelected(null)}
          onUpdate={async (id, data) => {
            await base44.entities.Booking.update(id, data);
            await base44.entities.BookingEvent.create({
              booking_id: id,
              event_type: data.status === "assigned" ? "RIDER_ASSIGNED" :
                data.status === "completed" ? "TRIP_ENDED" :
                data.status === "cancelled" ? "BOOKING_CANCELLED" : "BOOKING_ROUTED_TO_NETWORK",
              actor_role: "dispatcher",
              details: JSON.stringify(data),
              timestamp: new Date().toISOString(),
            });
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}