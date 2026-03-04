import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Shield, Star, Zap } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";

const ZONE_COLORS = {
  "Jaro": "from-orange-500/20 to-orange-600/5 border-orange-500/30",
  "Mandurriao": "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  "City Proper": "from-purple-500/20 to-purple-600/5 border-purple-500/30",
  "La Paz": "from-green-500/20 to-green-600/5 border-green-500/30",
  "Arevalo": "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30",
};

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [z, n, b] = await Promise.all([
      base44.entities.Zone.list(),
      base44.entities.Network.list(),
      base44.entities.Booking.list("-created_date", 500),
    ]);
    setZones(z);
    setNetworks(n);
    setBookings(b);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const allZoneNames = ["Jaro", "Mandurriao", "City Proper", "La Paz", "Arevalo"];

  const getZoneStats = (zoneName) => {
    const zoneBookings = bookings.filter(b => b.zone === zoneName);
    const zoneNetworks = networks.filter(n => n.zone === zoneName && n.status === "approved");
    const zoneRecord = zones.find(z => z.name === zoneName);
    return {
      bookings: zoneBookings.length,
      activeBookings: zoneBookings.filter(b => ["searching","assigned","otw","arrived","in_progress"].includes(b.status)).length,
      networks: zoneNetworks.length,
      isPremium: zoneRecord?.is_premium || false,
      status: zoneRecord?.status || "available",
      assignedNetwork: zoneRecord?.assigned_network_name || (zoneNetworks[0]?.name || null),
      volumeLevel: zoneRecord?.volume_level || (zoneBookings.length > 20 ? "high" : zoneBookings.length > 5 ? "medium" : "low"),
    };
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Zones</h1>
        <p className="text-gray-400 text-sm mt-0.5">Territory management for Iloilo City</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allZoneNames.map(zoneName => {
          const stats = getZoneStats(zoneName);
          return (
            <div key={zoneName} className={`bg-gradient-to-br ${ZONE_COLORS[zoneName]} border rounded-xl p-5`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-white" />
                  <div>
                    <h3 className="text-white font-bold">{zoneName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {stats.isPremium && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" /> Premium
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        stats.volumeLevel === "high" ? "bg-red-500/20 text-red-400" :
                        stats.volumeLevel === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-green-500/20 text-green-400"
                      }`}>{stats.volumeLevel} volume</span>
                    </div>
                  </div>
                </div>
                <StatusBadge status={stats.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-black/20 rounded-lg p-2.5 text-center">
                  <div className="text-xl font-bold text-white">{stats.bookings}</div>
                  <div className="text-xs text-gray-400">Total Bookings</div>
                </div>
                <div className="bg-black/20 rounded-lg p-2.5 text-center">
                  <div className="text-xl font-bold text-orange-400">{stats.activeBookings}</div>
                  <div className="text-xs text-gray-400">Active Now</div>
                </div>
                <div className="bg-black/20 rounded-lg p-2.5 text-center">
                  <div className="text-xl font-bold text-white">{stats.networks}</div>
                  <div className="text-xs text-gray-400">Networks</div>
                </div>
              </div>

              {stats.assignedNetwork && (
                <div className="flex items-center gap-2 text-sm bg-black/20 rounded-lg px-3 py-2">
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-xs">Primary: <span className="text-white font-medium">{stats.assignedNetwork}</span></span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zone dispatch rules */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-400" /> Zone Dispatch Rules
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
              <span>Bookings are routed to the network assigned to the pickup zone</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
              <span>Zones define dispatch rights, not rider movement limits</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
              <span>Premium zones carry additional monthly territory fees</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
              <span>Zone qualification requires capacity + SLA compliance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}