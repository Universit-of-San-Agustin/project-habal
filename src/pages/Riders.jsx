import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Bike, Star } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import RiderModal from "../components/riders/RiderModal";
import RiderDetail from "../components/riders/RiderDetail";

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const [r, n] = await Promise.all([
      base44.entities.Rider.list("-created_date"),
      base44.entities.Network.filter({ status: "approved" }),
    ]);
    setRiders(r);
    setNetworks(n);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = riders.filter(r => {
    const matchSearch = !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search) || r.plate_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Riders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{riders.length} registered riders</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Rider
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search riders..."
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
          {["All", "pending", "active", "suspended", "banned"].map(s => (
            <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["Rider", "Network", "Zone", "Vehicle", "Trips", "Rating", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No riders found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} onClick={() => setSelected(r)}
                  className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                        <Bike className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <div className="text-sm text-white font-medium">{r.full_name}</div>
                        <div className="text-xs text-gray-400">{r.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">{r.network_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{r.zone || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-300">{r.plate_number || "—"}</div>
                    <div className="text-xs text-gray-500">{r.motorcycle_make} {r.motorcycle_model}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{r.completed_trips || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-sm text-white">{r.avg_rating?.toFixed(1) || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); setEditItem(r); setShowModal(true); }}
                      className="text-xs text-orange-400 hover:text-orange-300">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <RiderModal
          rider={editItem}
          networks={networks}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            if (editItem) await base44.entities.Rider.update(editItem.id, data);
            else await base44.entities.Rider.create(data);
            setShowModal(false);
            load();
          }}
        />
      )}

      {selected && (
        <RiderDetail
          rider={selected}
          onClose={() => setSelected(null)}
          onUpdate={async (id, data) => {
            await base44.entities.Rider.update(id, data);
            setSelected(null);
            load();
          }}
          onEdit={() => { setEditItem(selected); setSelected(null); setShowModal(true); }}
        />
      )}
    </div>
  );
}