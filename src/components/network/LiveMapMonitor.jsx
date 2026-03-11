import { useState, useEffect, useRef } from "react";
import { X, Users, Filter, Search, Navigation, MapPin, Bike } from "lucide-react";
import MapboxMap from "../home/MapboxMap";
import { base44 } from "@/api/base44Client";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";

export default function LiveMapMonitor({ networkId, onClose }) {
  const [riders, setRiders] = useState([]);
  const [riderLocations, setRiderLocations] = useState({});
  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [filter, setFilter] = useState("all"); // all | online | on_trip | idle
  const [searchQuery, setSearchQuery] = useState("");
  const [routeCoordinates, setRouteCoordinates] = useState({});

  // Fetch network riders
  useEffect(() => {
    if (!networkId) return;
    const loadRiders = async () => {
      const allRiders = await base44.entities.Rider.filter({ network_id: networkId }, "-updated_date", 100).catch(() => []);
      setRiders(allRiders.filter(r => r.status === "active"));
    };
    loadRiders();
    const interval = setInterval(loadRiders, 10000); // Refresh rider list every 10s
    return () => clearInterval(interval);
  }, [networkId]);

  // Real-time location polling (2s interval)
  useEffect(() => {
    if (riders.length === 0) return;
    
    const pollLocations = async () => {
      const riderIds = riders.map(r => r.id);
      const locations = {};
      
      // Fetch all rider locations in parallel
      await Promise.all(riderIds.map(async (riderId) => {
        const locs = await base44.entities.RiderLocation.filter({ rider_id: riderId }, "-updated_date", 1).catch(() => []);
        if (locs?.[0]) {
          locations[riderId] = {
            lat: locs[0].lat,
            lng: locs[0].lng,
            heading: locs[0].heading || 0,
            speed: locs[0].speed || 0,
            status: locs[0].status || "idle",
            booking_id: locs[0].booking_id,
            timestamp: locs[0].updated_date
          };
        }
      }));
      
      setRiderLocations(locations);
    };

    pollLocations();
    const interval = setInterval(pollLocations, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, [riders]);

  // Fetch active bookings for network
  useEffect(() => {
    if (!networkId) return;
    
    const loadBookings = async () => {
      const bookings = await base44.entities.Booking.filter(
        { network_id: networkId },
        "-updated_date",
        50
      ).catch(() => []);
      
      const active = bookings.filter(b => 
        ["assigned", "otw", "arrived", "in_progress"].includes(b.status)
      );
      setActiveBookings(active);
      
      // Fetch routes for active trips
      const routes = {};
      for (const booking of active) {
        if (booking.rider_id && riderLocations[booking.rider_id]) {
          const riderLoc = riderLocations[booking.rider_id];
          // Fetch route geometry from backend
          try {
            const isEnRoute = ["assigned", "otw", "arrived"].includes(booking.status);
            // For now, store booking coords for route rendering
            routes[booking.id] = {
              rider: riderLoc,
              pickup: { address: booking.pickup_address },
              dropoff: { address: booking.dropoff_address },
              phase: isEnRoute ? "pickup" : "dropoff"
            };
          } catch (err) {
            console.error("Route fetch failed:", err);
          }
        }
      }
      setRouteCoordinates(routes);
    };

    loadBookings();
    const interval = setInterval(loadBookings, 3000); // Poll bookings every 3s
    return () => clearInterval(interval);
  }, [networkId, riderLocations]);

  // Filter riders
  const filteredRiders = riders.filter(rider => {
    const loc = riderLocations[rider.id];
    const hasLocation = !!loc;
    const isOnline = rider.online_status === "online" || rider.online_status === "on_trip";
    const onTrip = loc?.status === "en_route_pickup" || loc?.status === "en_route_dropoff";
    
    // Apply status filter
    if (filter === "online" && !isOnline) return false;
    if (filter === "on_trip" && !onTrip) return false;
    if (filter === "idle" && (onTrip || !isOnline)) return false;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!rider.full_name?.toLowerCase().includes(query) && 
          !rider.id?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    return hasLocation; // Only show riders with location data
  });

  // Marker click handler
  const handleMarkerClick = (riderId) => {
    const rider = riders.find(r => r.id === riderId);
    setSelectedRider(rider);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="font-bold text-gray-900">Live Rider Map</h2>
              <p className="text-xs text-gray-500">{filteredRiders.length} riders visible</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">Live</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3">
          {[
            { id: "all", label: "All", icon: Users },
            { id: "online", label: "Online", icon: Users },
            { id: "on_trip", label: "On Trip", icon: Bike },
            { id: "idle", label: "Idle", icon: Users }
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={filter === f.id ? 
                { background: PRIMARY, color: "white" } : 
                { background: "#f3f4f6", color: "#6b7280" }
              }>
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search riders..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Map */}
      <div className="absolute inset-0 pt-[180px]">
        <LiveOperatorMap
          riders={filteredRiders}
          riderLocations={riderLocations}
          activeBookings={activeBookings}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* Rider Detail Panel */}
      {selectedRider && (
        <RiderDetailPanel
          rider={selectedRider}
          location={riderLocations[selectedRider.id]}
          activeBooking={activeBookings.find(b => b.rider_id === selectedRider.id)}
          onClose={() => setSelectedRider(null)}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-3 text-xs">
        <div className="font-bold text-gray-700 mb-2">Status</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">On Trip</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600">Assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-gray-600">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveOperatorMap({ riders, riderLocations, activeBookings, onMarkerClick }) {
  const mapRef = useRef(null);
  const markersRef = useRef({});

  return (
    <div className="w-full h-full relative">
      <MapboxMap
        className="w-full h-full"
        zoom={13}
      />
      {/* Render custom markers overlay */}
      <RiderMarkersOverlay
        riders={riders}
        riderLocations={riderLocations}
        activeBookings={activeBookings}
        onMarkerClick={onMarkerClick}
      />
    </div>
  );
}

function RiderMarkersOverlay({ riders, riderLocations, activeBookings, onMarkerClick }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {riders.map(rider => {
        const loc = riderLocations[rider.id];
        if (!loc) return null;

        const booking = activeBookings.find(b => b.rider_id === rider.id);
        const isOnTrip = loc.status === "en_route_pickup" || loc.status === "en_route_dropoff";
        const isAssigned = booking?.status === "assigned";
        const isOnline = rider.online_status === "online" || rider.online_status === "on_trip";

        let markerColor = "#9ca3af"; // gray - offline
        if (isOnTrip) markerColor = "#3b82f6"; // blue - on trip
        else if (isAssigned) markerColor = "#f59e0b"; // yellow - assigned
        else if (isOnline) markerColor = "#10b981"; // green - available

        return (
          <div
            key={rider.id}
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
            onClick={() => onMarkerClick(rider.id)}
          >
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: markerColor }}
              >
                🏍
              </div>
              {isOnline && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: markerColor, opacity: 0.3 }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RiderDetailPanel({ rider, location, activeBooking, onClose }) {
  return (
    <div className="absolute right-4 top-[200px] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-30">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: PRIMARY + "10" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: PRIMARY + "30" }}>
            🏍
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">{rider.full_name}</div>
            <div className="text-xs text-gray-500">{rider.plate_number || "No plate"}</div>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${rider.online_status === "online" || rider.online_status === "on_trip" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
          <span className="text-sm font-semibold text-gray-700">
            {rider.online_status === "online" ? "Online - Available" : 
             rider.online_status === "on_trip" ? "On Trip" : "Offline"}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-lg font-black text-gray-900">{rider.completed_trips || 0}</div>
            <div className="text-[10px] text-gray-500">Trips</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-lg font-black text-yellow-500">{rider.avg_rating ? rider.avg_rating.toFixed(1) : "—"}</div>
            <div className="text-[10px] text-gray-500">Rating</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-lg font-black" style={{ color: PRIMARY }}>{location?.speed?.toFixed(0) || 0}</div>
            <div className="text-[10px] text-gray-500">km/h</div>
          </div>
        </div>

        {/* Active Booking */}
        {activeBooking && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Active Trip</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                {activeBooking.status}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                <span className="text-gray-600 line-clamp-2">{activeBooking.pickup_address}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-2.5 h-2.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 line-clamp-2">{activeBooking.dropoff_address}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">Customer</span>
              <span className="text-xs font-semibold text-gray-900">{activeBooking.customer_name}</span>
            </div>
            {activeBooking.fare_estimate && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Fare</span>
                <span className="text-sm font-black text-emerald-600">₱{activeBooking.fare_estimate}</span>
              </div>
            )}
          </div>
        )}

        {/* Location Info */}
        {location && (
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            <div className="flex justify-between">
              <span>Last updated</span>
              <span>{new Date(location.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Coordinates</span>
              <span>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}