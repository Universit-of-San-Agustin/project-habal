import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, CheckCircle, XCircle, Shield, Users, Wallet } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import NetworkModal from "../components/networks/NetworkModal";
import NetworkDetail from "../components/networks/NetworkDetail";

export default function Networks() {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = () => base44.entities.Network.list("-created_date").then(n => { setNetworks(n); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = networks.filter(n =>
    !search || n.name?.toLowerCase().includes(search.toLowerCase()) || n.owner_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Networks</h1>
          <p className="text-gray-400 text-sm mt-0.5">{networks.length} partner networks</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Network
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search networks..."
          className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500" />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-800 rounded w-1/2" />
          </div>
        )) : filtered.map(n => (
          <div key={n.id} onClick={() => setSelected(n)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold text-sm">{n.name}</h3>
                  {n.verified_badge && <Shield className="w-4 h-4 text-green-400" />}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{n.owner_name}</div>
              </div>
              <StatusBadge status={n.status} />
            </div>
            <div className="text-xs text-orange-400 font-medium mb-3">{n.zone}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-white font-bold text-sm">{n.active_rider_seats || 30}</div>
                <div className="text-gray-500 text-xs">Seats</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <div className="text-white font-bold text-sm">{n.strikes || 0}</div>
                <div className="text-gray-500 text-xs">Strikes</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-2">
                <div className={`font-bold text-sm ${(n.wallet_balance || 0) < (n.wallet_threshold || 5000) ? "text-red-400" : "text-green-400"}`}>
                  ₱{((n.wallet_balance || 0) / 1000).toFixed(1)}k
                </div>
                <div className="text-gray-500 text-xs">Wallet</div>
              </div>
            </div>
            {(n.wallet_balance || 0) < (n.wallet_threshold || 5000) && (
              <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                ⚠ Wallet below threshold — network paused
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <NetworkModal
          network={editItem}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            if (editItem) await base44.entities.Network.update(editItem.id, data);
            else await base44.entities.Network.create(data);
            setShowModal(false);
            load();
          }}
        />
      )}

      {selected && (
        <NetworkDetail
          network={selected}
          onClose={() => setSelected(null)}
          onUpdate={async (id, data) => {
            await base44.entities.Network.update(id, data);
            setSelected(null);
            load();
          }}
          onEdit={() => { setEditItem(selected); setSelected(null); setShowModal(true); }}
        />
      )}
    </div>
  );
}