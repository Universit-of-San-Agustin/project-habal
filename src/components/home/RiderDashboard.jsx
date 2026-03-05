import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  MapPin, Clock, Star, User, LogOut, CheckCircle, XCircle,
  Bike, MessageCircle, Navigation, Home, ChevronLeft,
  TrendingUp, DollarSign, Award, Phone, Shield
} from "lucide-react";
import MapboxMap from "./MapboxMap";
import ChatPanel from "../chat/ChatPanel";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";
const GREEN = "#10b981";
const GREEN_DARK = "#059669";
const GREEN_BG = "#f0fdf4";

export default function RiderDashboard({ user }) {
  const [screen, setScreen] = useState("home"); // home | map | history | profile
  const [riderData, setRiderData] = useState(null);
  const [incomingBooking, setIncomingBooking] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [tripHistory, setTripHistory] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const seenBookingsRef = useRef(new Set());
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Load data
  useEffect(() => {
    base44.entities.Rider.filter({ email: user?.email }, "-created_date", 1)
      .then(rows => setRiderData(rows?.[0] || null)).catch(() => {});
    base44.entities.Booking.filter({ rider_phone: user?.email }, "-created_date", 50)
      .then(setTripHistory).catch(() => {});
    base44.entities.Booking.filter({ rider_phone: user?.email }, "-created_date", 5).then(rows => {
      const active = rows?.find(b => ["assigned", "otw", "arrived", "in_progress"].includes(b.status));
      if (active) { setActiveBooking(active); setScreen("map"); }
    });
  }, [user]);

  // GPS broadcast
  useEffect(() => {
    if (!riderData?.id || !isOnline) return;
    const watchId = navigator.geolocation?.watchPosition(
      ({ coords: { longitude: lng, latitude: lat } }) => {
        base44.entities.RiderLocation.filter({ rider_id: riderData.id }, "-updated_date", 1).then(locs => {
          if (locs?.[0]) base44.entities.RiderLocation.update(locs[0].id, { lat, lng, rider_name: user?.full_name });
          else base44.entities.RiderLocation.create({ rider_id: riderData.id, rider_name: user?.full_name, lat, lng });
        });
      },
      () => {}, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation?.clearWatch(watchId);
  }, [riderData?.id, isOnline]);

  // Countdown for incoming booking
  useEffect(() => {
    if (!incomingBooking) {
      setCountdown(30);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(countdownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [incomingBooking?.id]);

  // Update online_status
  useEffect(() => {
    if (!riderData?.id) return;
    base44.entities.Rider.update(riderData.id, { online_status: isOnline ? "online" : "offline" }).catch(() => {});
  }, [isOnline, riderData?.id]);

  // Poll for new bookings
  useEffect(() => {
    if (!riderData?.id || !isOnline || activeBooking) return;
    const poll = async () => {
      const rows = await base44.entities.Booking.filter(
        { rider_id: riderData.id, status: "assigned" }, "-created_date", 3
      );
      const fresh = rows?.find(b => !seenBookingsRef.current.has(b.id));
      if (fresh) {
        seenBookingsRef.current.add(fresh.id);
        setIncomingBooking(fresh);
        timerRef.current = setTimeout(async () => {
          await base44.entities.Booking.update(fresh.id, { status: "pending", rider_id: null, rider_name: null, rider_phone: null }).catch(() => {});
          await base44.entities.Rider.update(riderData.id, { online_status: "online" }).catch(() => {});
          setIncomingBooking(null);
        }, 30000);
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { clearInterval(interval); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [riderData?.id, isOnline, activeBooking]);

  const handleAccept = async () => {
    if (!incomingBooking) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setProcessing(true);
    await base44.entities.Booking.update(incomingBooking.id, { status: "assigned", assigned_at: new Date().toISOString() });
    await base44.entities.BookingEvent.create({ booking_id: incomingBooking.id, event_type: "RIDER_ACCEPTED", actor_role: "rider", actor_name: user?.full_name, timestamp: new Date().toISOString() });
    await base44.entities.Rider.update(riderData.id, { online_status: "on_trip" }).catch(() => {});
    setActiveBooking({ ...incomingBooking, status: "assigned" });
    setIncomingBooking(null);
    setProcessing(false);
    setScreen("map");
  };

  const handleDecline = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (incomingBooking) {
      await base44.entities.Booking.update(incomingBooking.id, { status: "pending", rider_id: null, rider_name: null, rider_phone: null }).catch(() => {});
      await base44.entities.Rider.update(riderData.id, { online_status: "online" }).catch(() => {});
      base44.functions.invoke("matchRider", { booking_id: incomingBooking.booking_id || incomingBooking.id }).catch(() => {});
    }
    setIncomingBooking(null);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!activeBooking) return;
    setProcessing(true);
    const eventMap = { otw: "RIDER_ACCEPTED", arrived: "RIDER_ARRIVED", in_progress: "TRIP_STARTED", completed: "TRIP_ENDED" };
    await base44.entities.Booking.update(activeBooking.id, {
      status: newStatus,
      ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
      ...(newStatus === "in_progress" ? { started_at: new Date().toISOString() } : {}),
    });
    await base44.entities.BookingEvent.create({ booking_id: activeBooking.id, event_type: eventMap[newStatus] || "TRIP_ENDED", actor_role: "rider", actor_name: user?.full_name, timestamp: new Date().toISOString() });
    if (newStatus === "completed") {
      setActiveBooking(null);
      if (riderData?.id) await base44.entities.Rider.update(riderData.id, { online_status: "online" }).catch(() => {});
      base44.entities.Booking.filter({ rider_phone: user?.email }, "-created_date", 50).then(setTripHistory);
      setScreen("home");
    } else {
      setActiveBooking(b => ({ ...b, status: newStatus }));
    }
    setProcessing(false);
  };

  const handleCancelRide = async () => {
    if (!activeBooking) return;
    setProcessing(true);
    await base44.entities.Booking.update(activeBooking.id, { status: "cancelled", cancelled_by: "rider", cancellation_reason: "Cancelled by rider" });
    await base44.entities.BookingEvent.create({ booking_id: activeBooking.id, event_type: "BOOKING_CANCELLED", actor_role: "rider", actor_name: user?.full_name, timestamp: new Date().toISOString() });
    if (riderData?.id) await base44.entities.Rider.update(riderData.id, { online_status: "online" }).catch(() => {});
    setActiveBooking(null);
    setProcessing(false);
    setScreen("home");
  };

  // Computed stats
  const today = new Date().toDateString();
  const tripsToday = tripHistory.filter(b => b.status === "completed" && new Date(b.created_date).toDateString() === today).length;
  const earningsToday = tripHistory.filter(b => b.status === "completed" && new Date(b.created_date).toDateString() === today).reduce((s, b) => s + (b.fare_estimate || 0), 0);
  const totalCompleted = tripHistory.filter(b => b.status === "completed").length;
  const avgRating = riderData?.avg_rating || (tripHistory.filter(b => b.customer_rating).length > 0
    ? (tripHistory.reduce((s, b) => s + (b.customer_rating || 0), 0) / tripHistory.filter(b => b.customer_rating).length)
    : null);

  const openMapsNavigation = (address) => {
    const q = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  // ── INCOMING BOOKING POPUP (always on top) ───────────────────
  const IncomingPopup = incomingBooking && (
    <div className="absolute inset-0 z-50 flex flex-col">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div className="bg-white rounded-t-3xl shadow-2xl">
        {/* Timer bar */}
        <div className="h-1 rounded-t-3xl overflow-hidden" style={{ background: "#e5e7eb" }}>
          <div className="h-full transition-all" style={{ width: `${(countdown / 30) * 100}%`, background: countdown <= 10 ? "#ef4444" : GREEN, transition: "width 1s linear" }} />
        </div>
        <div className="px-5 pt-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-emerald-600 text-sm uppercase tracking-wider">New Trip Request</span>
            </div>
            <div className={`text-sm font-black tabular-nums px-3 py-1 rounded-full ${countdown <= 10 ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-600"}`}>
              {countdown}s
            </div>
          </div>
          {/* Customer + fare */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl flex-shrink-0">👤</div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-base">{incomingBooking.customer_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{incomingBooking.zone} · {incomingBooking.payment_method?.toUpperCase() || "CASH"}</div>
            </div>
            {incomingBooking.fare_estimate && (
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-black text-emerald-600">₱{incomingBooking.fare_estimate}</div>
                <div className="text-[10px] text-gray-400">est. fare</div>
              </div>
            )}
          </div>
          {/* Route */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                <div className="w-0.5 h-4 bg-gray-200" />
                <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pickup</div>
                  <div className="text-sm text-gray-800 font-semibold leading-snug">{incomingBooking.pickup_address}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Dropoff</div>
                  <div className="text-sm text-gray-800 font-semibold leading-snug">{incomingBooking.dropoff_address}</div>
                </div>
              </div>
            </div>
          </div>
          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={handleDecline} disabled={processing}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-2 text-base disabled:opacity-50">
              <XCircle className="w-5 h-5 text-red-400" /> Decline
            </button>
            <button onClick={handleAccept} disabled={processing}
              className="flex-1 py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base disabled:opacity-50 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`, boxShadow: "0 6px 24px rgba(16,185,129,0.35)" }}>
              {processing
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><CheckCircle className="w-5 h-5" /> Accept</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── HISTORY ──────────────────────────────────────────────────
  if (screen === "history") {
    return (
      <Shell>
        {IncomingPopup}
        <ScreenHeader title="Trip History" onBack={() => setScreen("home")} />
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Completed", value: totalCompleted, color: GREEN },
              { label: "Cancelled", value: tripHistory.filter(b => b.status === "cancelled").length, color: "#ef4444" },
              { label: "Total", value: tripHistory.length, color: "#6366f1" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
                <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          {tripHistory.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-gray-300">
              <Bike className="w-14 h-14 mb-4 opacity-30" />
              <p className="font-semibold text-gray-400">No trips yet</p>
              <p className="text-xs mt-1">Go online to receive ride requests</p>
            </div>
          ) : tripHistory.map(b => (
            <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">🏍</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{b.customer_name}</div>
                    <div className="text-[10px] font-mono text-gray-400">{b.booking_id || b.id?.slice(0, 8)}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${b.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                  {b.status}
                </span>
              </div>
              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="truncate">{b.pickup_address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                  <span className="truncate">{b.dropoff_address}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                {b.fare_estimate
                  ? <span className="text-sm font-black text-emerald-600">₱{b.fare_estimate}</span>
                  : <span />}
                {b.customer_rating
                  ? <div className="flex">{[1,2,3,4,5].map(n => <span key={n} className={`text-xs ${n <= b.customer_rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>)}</div>
                  : null}
              </div>
            </div>
          ))}
        </div>
        <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
      </Shell>
    );
  }

  // ── PROFILE ──────────────────────────────────────────────────
  if (screen === "profile") {
    return <RiderProfileScreen user={user} riderData={riderData} setRiderData={setRiderData}
      screen={screen} setScreen={setScreen} activeBooking={activeBooking} IncomingPopup={IncomingPopup} />;
  }

  // ── MAP / ACTIVE TRIP ────────────────────────────────────────
  if (screen === "map") {
    return (
      <Shell noScroll>
        {IncomingPopup}
        <div className="absolute inset-0 bottom-16">
          <MapboxMap className="w-full h-full" onGeolocate={() => {}} />
        </div>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-2 pointer-events-none">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen("home")}
              className="w-10 h-10 bg-white rounded-2xl shadow-md flex items-center justify-center pointer-events-auto">
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="bg-white rounded-2xl shadow-md px-3 py-2 pointer-events-auto">
              <div className={`flex items-center gap-2 text-sm font-bold ${isOnline ? "text-emerald-600" : "text-gray-500"}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>
        </div>
        {/* Active booking sheet */}
        {activeBooking && (
          <div className="absolute bottom-16 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-3" />
            <div className="px-5 pb-6 space-y-3">
              {/* Status badge */}
              <TripStatusBadge status={activeBooking.status} />
              {/* Customer card */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">👤</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-sm">{activeBooking.customer_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {activeBooking.payment_method?.toUpperCase() || "CASH"} · {activeBooking.fare_estimate ? `₱${activeBooking.fare_estimate}` : "—"}
                  </div>
                </div>
                <button onClick={() => setShowChat(true)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#eff6ff" }}>
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                </button>
              </div>
              {/* Route */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600 truncate flex-1">{activeBooking.pickup_address}</span>
                  <button onClick={() => openMapsNavigation(activeBooking.pickup_address)}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                    style={{ background: GREEN_BG, color: GREEN_DARK }}>
                    <Navigation className="w-3 h-3" /> Nav
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600 truncate flex-1">{activeBooking.dropoff_address}</span>
                  <button onClick={() => openMapsNavigation(activeBooking.dropoff_address)}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                    style={{ background: "#fffbeb", color: "#d97706" }}>
                    <Navigation className="w-3 h-3" /> Nav
                  </button>
                </div>
              </div>
              {/* Action button */}
              <div className="flex gap-2 pt-1">
                {activeBooking.status === "assigned" && (
                  <TripBtn onClick={() => handleStatusUpdate("otw")} loading={processing} color={GREEN}>🏍 On My Way</TripBtn>
                )}
                {activeBooking.status === "otw" && (
                  <TripBtn onClick={() => handleStatusUpdate("arrived")} loading={processing} color={GREEN}>📍 I've Arrived</TripBtn>
                )}
                {activeBooking.status === "arrived" && (
                  <TripBtn onClick={() => handleStatusUpdate("in_progress")} loading={processing} color="#3b82f6">🚀 Start Trip</TripBtn>
                )}
                {activeBooking.status === "in_progress" && (
                  <TripBtn onClick={() => handleStatusUpdate("completed")} loading={processing} color={GREEN}>✅ End Trip</TripBtn>
                )}
                {["assigned", "otw"].includes(activeBooking.status) && (
                  <button onClick={handleCancelRide} disabled={processing}
                    className="py-3.5 px-4 border-2 border-red-100 text-red-400 font-bold rounded-2xl text-sm disabled:opacity-50">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* No active ride on map */}
        {!activeBooking && (
          <div className="absolute bottom-16 left-0 right-0 z-20">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-3xl px-5 py-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: GREEN_BG }}>
                    <Bike className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  {isOnline && <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(16,185,129,0.2)", animationDuration: "2s" }} />}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{isOnline ? "Waiting for ride requests" : "You are offline"}</div>
                  <div className="text-xs text-gray-400">{isOnline ? "Stay on the map to receive bookings" : "Go online from the Home screen"}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {showChat && activeBooking && (
          <ChatPanel bookingId={activeBooking.booking_id || activeBooking.id} currentUser={user} senderRole="rider" onClose={() => setShowChat(false)} />
        )}
        <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
      </Shell>
    );
  }

  // ── HOME DASHBOARD ───────────────────────────────────────────
  return (
    <Shell>
      {IncomingPopup}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Header */}
        <div className="px-4 pt-12 pb-5" style={{ background: `linear-gradient(160deg, ${GREEN} 0%, ${GREEN_DARK} 100%)` }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-bold text-white">
                {user?.full_name?.charAt(0) || "R"}
              </div>
              <div>
                <div className="text-white/80 text-xs">Welcome back,</div>
                <div className="text-white font-bold text-base leading-tight">{user?.full_name?.split(" ")[0] || "Rider"}</div>
              </div>
            </div>
            <img src={HABAL_LOGO} alt="Habal" className="w-9 h-9 object-contain opacity-90" />
          </div>
          {/* Online toggle */}
          <button
            onClick={() => setIsOnline(o => !o)}
            className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all ${isOnline ? "bg-white text-emerald-600" : "bg-white/20 text-white border-2 border-white/30"}`}>
            <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-emerald-500 shadow-md" : "bg-white/50"}`} />
            {isOnline ? "● You are Online" : "○ You are Offline"}
            <span className="text-xs font-normal opacity-60">(tap to {isOnline ? "go offline" : "go online"})</span>
          </button>
        </div>

        {/* Active trip alert */}
        {activeBooking && (
          <button onClick={() => setScreen("map")}
            className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-sm border-2"
            style={{ background: GREEN_BG, borderColor: GREEN + "40" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GREEN }}>
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-emerald-700 text-sm">Active Trip</div>
              <div className="text-xs text-emerald-600/70 mt-0.5 truncate">{activeBooking.customer_name} · {activeBooking.status}</div>
            </div>
            <div className="text-xs font-bold px-3 py-1.5 bg-emerald-500 text-white rounded-xl">View →</div>
          </button>
        )}

        {/* Today's stats */}
        <div className="px-4 mt-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Today's Summary</div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Bike className="w-5 h-5" />} label="Trips" value={tripsToday} color={GREEN} />
            <StatCard icon={<Star className="w-5 h-5" />} label="Rating" value={avgRating ? avgRating.toFixed(1) : "—"} color="#f59e0b" />
            <StatCard icon={<DollarSign className="w-5 h-5" />} label="Earnings" value={`₱${earningsToday}`} color="#6366f1" />
          </div>
        </div>

        {/* Overall stats */}
        <div className="px-4 mt-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">All Time</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">Total Trips</div>
              <div className="text-2xl font-black" style={{ color: GREEN }}>{totalCompleted}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Completed rides</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">All-time Earnings</div>
              <div className="text-2xl font-black text-gray-900">
                ₱{tripHistory.filter(b => b.status === "completed").reduce((s, b) => s + (b.fare_estimate || 0), 0)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Cash received</div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-4 mt-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setScreen("map")}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GREEN_BG }}>
                <Navigation className="w-5 h-5" style={{ color: GREEN }} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-800 text-sm">Open Map</div>
                <div className="text-[10px] text-gray-400">Navigate</div>
              </div>
            </button>
            <button onClick={() => setScreen("history")}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-800 text-sm">History</div>
                <div className="text-[10px] text-gray-400">{tripHistory.length} total trips</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent trips */}
        {tripHistory.slice(0, 3).length > 0 && (
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Trips</div>
              <button onClick={() => setScreen("history")} className="text-xs font-semibold" style={{ color: GREEN }}>See all</button>
            </div>
            {tripHistory.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-2 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">🏍</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{b.customer_name}</div>
                  <div className="text-xs text-gray-400 truncate">{b.dropoff_address?.split(",")[0]}</div>
                </div>
                {b.fare_estimate && <div className="font-black text-emerald-600 text-sm flex-shrink-0">₱{b.fare_estimate}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
    </Shell>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Shell({ children, noScroll }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 max-w-md mx-auto overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');`}</style>
      <div className={`flex-1 relative ${noScroll ? "" : "overflow-y-auto"}`}>
        {children}
      </div>
    </div>
  );
}

function ScreenHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-12 pb-4 bg-white border-b border-gray-100">
      {onBack && (
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      )}
      <h1 className="font-bold text-gray-900 text-lg">{title}</h1>
    </div>
  );
}

function BottomNav({ screen, setScreen, hasActive }) {
  const tabs = [
    { id: "home",    label: "Home",    icon: Home },
    { id: "map",     label: "Map",     icon: Navigation },
    { id: "history", label: "Trips",   icon: Clock },
    { id: "profile", label: "Profile", icon: User },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex px-2 py-1" style={{ height: 64 }}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = screen === id;
        return (
          <button key={id} onClick={() => setScreen(id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative">
            {id === "map" && hasActive && (
              <div className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-red-500" />
            )}
            <div className={`w-10 h-8 rounded-xl flex items-center justify-center transition-all`}
              style={active ? { background: GREEN_BG } : {}}>
              <Icon className="w-5 h-5 transition-colors" style={{ color: active ? GREEN : "#9ca3af" }} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: active ? GREEN : "#9ca3af" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: color + "18", color }}>
        {icon}
      </div>
      <div className="text-lg font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function TripStatusBadge({ status }) {
  const MAP = {
    assigned:    { label: "Head to Pickup", bg: "#fef3c7", color: "#d97706" },
    otw:         { label: "On the Way 🏍", bg: "#eff6ff", color: "#2563eb" },
    arrived:     { label: "Waiting at Pickup 📍", bg: "#f0fdf4", color: "#15803d" },
    in_progress: { label: "Trip in Progress 🚀", bg: "#f5f3ff", color: "#7c3aed" },
  };
  const cfg = MAP[status] || MAP.assigned;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      {cfg.label}
    </div>
  );
}

function TripBtn({ children, onClick, loading, color }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex-1 py-3.5 text-white font-bold rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-1"
      style={{ background: color, boxShadow: `0 4px 16px ${color}50` }}>
      {loading
        ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        : children}
    </button>
  );
}

function RiderProfileScreen({ user, riderData, setRiderData, screen, setScreen, activeBooking, IncomingPopup }) {
  const [form, setForm] = useState({
    motorcycle_make: riderData?.motorcycle_make || "",
    motorcycle_model: riderData?.motorcycle_model || "",
    plate_number: riderData?.plate_number || "",
    phone: riderData?.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!riderData?.id) return;
    setSaving(true);
    const updated = await base44.entities.Rider.update(riderData.id, form);
    setRiderData(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Shell>
      {IncomingPopup}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Hero */}
        <div className="px-4 pt-12 pb-6" style={{ background: `linear-gradient(160deg, ${GREEN} 0%, ${GREEN_DARK} 100%)` }}>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-4xl mb-3">🏍</div>
            <div className="font-bold text-white text-lg">{user?.full_name}</div>
            <div className="text-green-100 text-xs mt-0.5">{user?.email}</div>
            <div className="flex items-center gap-2 mt-3">
              <span className="px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold">
                {riderData?.avg_rating ? `⭐ ${riderData.avg_rating.toFixed(1)}` : "⭐ New"}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold">
                {riderData?.completed_trips || 0} Trips
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${riderData?.status === "active" ? "bg-white text-emerald-700" : "bg-white/20 text-white"}`}>
                {riderData?.status || "pending"}
              </span>
            </div>
          </div>
        </div>
        {/* Form */}
        <div className="px-4 py-4 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle Details</div>
          {[
            { label: "Motorcycle Make", key: "motorcycle_make", placeholder: "e.g. Honda" },
            { label: "Motorcycle Model", key: "motorcycle_model", placeholder: "e.g. XRM125" },
            { label: "Plate Number", key: "plate_number", placeholder: "e.g. ABC 1234" },
            { label: "Phone Number", key: "phone", placeholder: "+63 900 000 0000" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" />
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 space-y-2">
          <button onClick={handleSave} disabled={saving || !riderData?.id}
            className="w-full py-4 text-white font-bold rounded-2xl text-sm disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)` }}>
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={() => base44.auth.logout()}
            className="w-full py-3 border-2 border-gray-200 text-gray-500 font-bold rounded-2xl text-sm flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
      <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
    </Shell>
  );
}

// ── useState import needed for RiderProfileScreen ─────────────
function useState(init) {
  return window.React.useState(init);
}