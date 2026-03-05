import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, MessageCircle, Navigation, X } from "lucide-react";
import MapboxMap from "../home/MapboxMap";
import ChatPanel from "../chat/ChatPanel";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

const STATUS_CONFIG = {
  pending:     { label: "Finding your rider...", bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b" },
  searching:   { label: "Searching nearby riders...", bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b" },
  assigned:    { label: "Rider is on the way! 🏍", bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY },
  otw:         { label: "Rider heading to you", bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY },
  arrived:     { label: "Rider has arrived! 🎉", bg: "#F0FDF4", color: "#15803d", dot: "#22c55e" },
  in_progress: { label: "You're on your way! 🚀", bg: "#EFF6FF", color: "#1d4ed8", dot: "#3b82f6" },
};

export default function LiveRideMap({ activeRide, user, pickupCoords, dropoffCoords, onClose, onShowChat }) {
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [followRider, setFollowRider] = useState(true);
  const MAPBOX_TOKEN = "pk.eyJ1IjoieWlrMzQzMDAiLCJhIjoiY21seWd1ZnlpMHl6MTNnc2dkbjcwZ2NmZCJ9.RRkFfU-zgGip8mt8af3MWg";

  useEffect(() => {
    if (!activeRide?.rider_id) return;
    const poll = async () => {
      const locs = await base44.entities.RiderLocation.filter({ rider_id: activeRide.rider_id }, "-updated_date", 1).catch(() => []);
      if (locs?.[0]) {
        const loc = { lat: locs[0].lat, lng: locs[0].lng };
        setRiderLocation(loc);
        // Compute ETA
        const isEnRoutePickup = ["assigned", "otw", "arrived"].includes(activeRide.status);
        const target = isEnRoutePickup ? pickupCoords : dropoffCoords;
        if (target) {
          try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${loc.lng},${loc.lat};${target.lng},${target.lat}?access_token=${MAPBOX_TOKEN}&overview=false`;
            const res = await fetch(url);
            const data = await res.json();
            const mins = data.routes?.[0]?.duration;
            if (mins != null) setEta({ minutes: Math.max(1, Math.round(mins / 60)), label: isEnRoutePickup ? "to pickup" : "to destination" });
          } catch {}
        }
      }
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [activeRide?.rider_id, activeRide?.status, pickupCoords, dropoffCoords]);

  const cfg = STATUS_CONFIG[activeRide?.status] || STATUS_CONFIG.pending;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapboxMap
          className="w-full h-full"
          pickupMarker={pickupCoords}
          dropoffMarker={activeRide?.status === "in_progress" ? dropoffCoords : null}
          riderMarker={riderLocation}
          followRider={followRider}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pointer-events-none">
        <div className="flex items-center justify-between">
          <button onClick={onClose}
            className="w-10 h-10 bg-white rounded-2xl shadow-md flex items-center justify-center pointer-events-auto">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="bg-white rounded-2xl shadow-md px-3 py-2 pointer-events-auto">
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: cfg.color }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.dot }} />
              {cfg.label}
            </div>
          </div>
          <button onClick={() => setFollowRider(f => !f)}
            className="w-10 h-10 bg-white rounded-2xl shadow-md flex items-center justify-center pointer-events-auto"
            title={followRider ? "Stop following" : "Follow rider"}>
            <Navigation className="w-5 h-5" style={{ color: followRider ? PRIMARY : "#9ca3af" }} />
          </button>
        </div>
      </div>

      {/* Bottom info sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-8">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />

        {/* ETA + rider info */}
        {activeRide?.rider_name ? (
          <div className="flex items-center gap-3 mb-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: PRIMARY_BG }}>🏍</div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-sm">{activeRide.rider_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">Your rider</div>
            </div>
            {eta && (
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-black" style={{ color: PRIMARY }}>{eta.minutes}<span className="text-sm font-semibold ml-0.5">min</span></div>
                <div className="text-[10px] text-gray-400">{eta.label}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-3" style={{ background: PRIMARY_BG }}>
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
              style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
            <span className="text-sm font-semibold" style={{ color: PRIMARY_DARK }}>Waiting for a rider to accept...</span>
          </div>
        )}

        {/* Route */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
            <span className="truncate">{activeRide?.pickup_address}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-amber-400 text-sm flex-shrink-0">●</span>
            <span className="truncate">{activeRide?.dropoff_address}</span>
          </div>
        </div>

        {/* Chat button */}
        {activeRide?.rider_name && (
          <button onClick={() => setShowChat(true)}
            className="w-full py-3 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
            <MessageCircle className="w-4 h-4" /> Chat with Rider
          </button>
        )}
      </div>

      {showChat && activeRide && (
        <ChatPanel bookingId={activeRide.booking_id || activeRide.id} currentUser={user} senderRole="customer" onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}