import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Star, User, LogOut, CheckCircle, XCircle, Bike } from "lucide-react";
import MapboxMap from "./MapboxMap";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

// Rider flow:
// "online"     → map, waiting for requests
// "incoming"   → new booking popup (accept/decline)
// "active"     → trip in progress controls
// "history"    → trip history
// "profile"    → rider profile edit

export default function RiderDashboard({ user }) {
  const [screen, setScreen] = useState("online");
  const [riderData, setRiderData] = useState(null);
  const [incomingBooking, setIncomingBooking] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [tripHistory, setTripHistory] = useState([]);
  const seenBookingsRef = useRef(new Set());
  const timerRef = useRef(null);

  // Load rider data
  useEffect(() => {
    base44.entities.Rider.filter({ email: user?.email }, "-created_date", 1)
      .then(rows => setRiderData(rows?.[0] || null)).catch(() => {});
    base44.entities.Booking.filter({ rider_phone: user?.email }, "-created_date", 30)
      .then(setTripHistory).catch(() => {});
    // Check for existing active booking
    base44.entities.Booking.filter({ rider_phone: user?.email }, "-created_date", 5).then(rows => {
      const active = rows?.find(b => ["assigned", "otw", "arrived", "in_progress"].includes(b.status));
      if (active) { setActiveBooking(active); setScreen("active"); }
    });
  }, [user]);

  // Broadcast GPS
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

  // Poll for bookings assigned to this rider by the auto-match system
  useEffect(() => {
    if (!riderData?.id || !isOnline || activeBooking || screen === "active") return;
    const poll = async () => {
      // Check for newly assigned bookings directed at this rider
      const rows = await base44.entities.Booking.filter(
        { rider_id: riderData.id, status: "assigned" }, "-created_date", 3
      );
      const fresh = rows?.find(b => !seenBookingsRef.current.has(b.id));
      if (fresh) {
        seenBookingsRef.current.add(fresh.id);
        setIncomingBooking(fresh);
        setScreen("incoming");
        // Auto-accept timeout: rider has 30s to respond, else release back
        timerRef.current = setTimeout(async () => {
          // Release the booking back to pending so another rider can be matched
          await base44.entities.Booking.update(fresh.id, {
            status: "pending",
            rider_id: null,
            rider_name: null,
            rider_phone: null,
          }).catch(() => {});
          await base44.entities.Rider.update(riderData.id, { online_status: "online" }).catch(() => {});
          setIncomingBooking(null);
          setScreen("online");
        }, 30000);
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { clearInterval(interval); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [riderData?.id, isOnline, activeBooking, screen]);

  const handleAccept = async () => {
    if (!incomingBooking) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setProcessing(true);
    // Booking is already assigned to this rider by auto-match — just confirm it
    await base44.entities.Booking.update(incomingBooking.id, {
      status: "assigned",
      assigned_at: new Date().toISOString(),
    });
    await base44.entities.BookingEvent.create({
      booking_id: incomingBooking.id, event_type: "RIDER_ACCEPTED",
      actor_role: "rider", actor_name: user?.full_name, timestamp: new Date().toISOString(),
    });
    await base44.entities.Rider.update(riderData.id, { online_status: "on_trip" }).catch(() => {});
    setActiveBooking({ ...incomingBooking, status: "assigned" });
    setIncomingBooking(null);
    setProcessing(false);
    setScreen("active");
  };

  const handleDecline = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Release booking back to pending for re-matching
    if (incomingBooking) {
      await base44.entities.Booking.update(incomingBooking.id, {
        status: "pending",
        rider_id: null,
        rider_name: null,
        rider_phone: null,
      }).catch(() => {});
      await base44.entities.Rider.update(riderData.id, { online_status: "online" }).catch(() => {});
      // Re-trigger auto-match for another rider
      base44.functions.invoke("matchRider", { booking_id: incomingBooking.booking_id || incomingBooking.id }).catch(() => {});
    }
    setIncomingBooking(null);
    setScreen("online");
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
    await base44.entities.BookingEvent.create({
      booking_id: activeBooking.id, event_type: eventMap[newStatus] || "BOOKING_REASSIGNED",
      actor_role: "rider", actor_name: user?.full_name, timestamp: new Date().toISOString(),
    });
    if (newStatus === "completed") {
      setActiveBooking(null);
      base44.entities.Booking.filter({ rider_phone: user?.email }, "-created_date", 30).then(setTripHistory);
      setScreen("online");
    } else {
      setActiveBooking(b => ({ ...b, status: newStatus }));
    }
    setProcessing(false);
  };

  const handleCancelRide = async () => {
    if (!activeBooking) return;
    setProcessing(true);
    await base44.entities.Booking.update(activeBooking.id, { status: "cancelled", cancelled_by: "rider", cancellation_reason: "Cancelled by rider" });
    await base44.entities.BookingEvent.create({ booking_id: activeBooking.id, event_type: "BOOKING_CANCELLED", actor_role: "rider", actor_name: user?.full_name, details: "Cancelled by rider", timestamp: new Date().toISOString() });
    setActiveBooking(null);
    setProcessing(false);
    setScreen("online");
  };

  // ── PROFILE ──────────────────────────────────────────────────
  if (screen === "profile") {
    return <RiderProfile user={user} riderData={riderData} setRiderData={setRiderData} onBack={() => setScreen("online")} />;
  }

  // ── HISTORY ──────────────────────────────────────────────────
  if (screen === "history") {
    return <RiderHistory trips={tripHistory} onBack={() => setScreen("online")} />;
  }

  const TABS = [
    { id: "online", label: "Home", icon: Bike },
    { id: "history", label: "History", icon: Clock },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-white max-w-md mx-auto overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

      {/* ── INCOMING REQUEST modal ── */}
      {screen === "incoming" && incomingBooking && (
        <div className="absolute inset-0 z-30 flex flex-col">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={handleDecline} />
          <div className="bg-white rounded-t-3xl px-5 pt-6 pb-8 shadow-2xl">
            {/* Pulse header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold text-emerald-600 text-sm uppercase tracking-wider">New Ride Request</span>
              </div>
              <span className="text-xs text-gray-400">30s to accept</span>
            </div>
            {/* Customer */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">👤</div>
              <div>
                <div className="font-bold text-gray-900">{incomingBooking.customer_name}</div>
                <div className="text-xs text-gray-400">{incomingBooking.zone}</div>
              </div>
              {incomingBooking.fare_estimate && (
                <div className="ml-auto text-right">
                  <div className="text-xl font-black text-emerald-600">₱{incomingBooking.fare_estimate}</div>
                  <div className="text-xs text-gray-400">est. fare</div>
                </div>
              )}
            </div>
            {/* Route */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 mb-5">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Pickup</div>
                  <div className="text-gray-800 font-medium leading-tight">{incomingBooking.pickup_address}</div>
                </div>
              </div>
              <div className="ml-1.5 w-0.5 h-3 bg-gray-200" />
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Dropoff</div>
                  <div className="text-gray-800 font-medium leading-tight">{incomingBooking.dropoff_address}</div>
                </div>
              </div>
            </div>
            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={handleDecline}
                className="flex-1 py-4 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-2 text-base">
                <XCircle className="w-5 h-5 text-red-400" /> Decline
              </button>
              <button onClick={handleAccept} disabled={processing}
                className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base disabled:opacity-60 shadow-lg"
                style={{ boxShadow: "0 4px 20px rgba(16,185,129,0.35)" }}>
                <CheckCircle className="w-5 h-5" /> Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map always shown as background */}
      <div className="flex-1 relative">
        <MapboxMap className="w-full h-full" onGeolocate={() => {}} />

        {/* Online/offline bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-2 pointer-events-none">
          <div className="flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2 pointer-events-auto">
            <img src={HABAL_LOGO} alt="Habal" className="w-7 h-7 object-contain" />
            <span className="font-bold text-gray-900 text-sm">{user?.full_name?.split(" ")[0]}</span>
          </div>
          <button
            onClick={() => setIsOnline(o => !o)}
            className={`px-4 py-2 rounded-2xl shadow-md font-bold text-sm pointer-events-auto transition-colors ${isOnline ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-300"}`}
          >
            {isOnline ? "● Online" : "○ Offline"}
          </button>
        </div>

        {/* Waiting message */}
        {screen === "online" && !activeBooking && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm rounded-t-3xl px-5 py-5 shadow-2xl">
            {isOnline ? (
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Bike className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" style={{ animationDuration: "2s" }} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Waiting for ride requests</div>
                  <div className="text-xs text-gray-400">You'll receive a notification when a customer books</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-1">You are offline — tap Online to receive rides</div>
            )}
          </div>
        )}

        {/* Active booking bottom sheet */}
        {screen === "active" && activeBooking && (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-6 space-y-3">
            {/* Status label */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
              activeBooking.status === "assigned" ? "bg-amber-50 text-amber-700" :
              activeBooking.status === "otw" ? "bg-blue-50 text-blue-700" :
              activeBooking.status === "arrived" ? "bg-emerald-50 text-emerald-700" :
              "bg-purple-50 text-purple-700"
            }`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {activeBooking.status === "assigned" && "Head to pickup point"}
              {activeBooking.status === "otw" && "On the way to customer"}
              {activeBooking.status === "arrived" && "Waiting for customer"}
              {activeBooking.status === "in_progress" && "Trip in progress"}
            </div>
            {/* Customer */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">👤</div>
              <div>
                <div className="font-bold text-gray-900 text-sm">{activeBooking.customer_name}</div>
                <div className="text-xs text-gray-400">{activeBooking.payment_method?.toUpperCase()} · {activeBooking.fare_estimate ? `₱${activeBooking.fare_estimate}` : "—"}</div>
              </div>
            </div>
            {/* Route */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="truncate">{activeBooking.pickup_address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                <span className="truncate">{activeBooking.dropoff_address}</span>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {activeBooking.status === "assigned" && (
                <button onClick={() => handleStatusUpdate("otw")} disabled={processing}
                  className="flex-1 py-3.5 bg-emerald-500 text-white font-bold rounded-2xl text-sm disabled:opacity-60">
                  I'm On My Way 🏍
                </button>
              )}
              {activeBooking.status === "otw" && (
                <button onClick={() => handleStatusUpdate("arrived")} disabled={processing}
                  className="flex-1 py-3.5 bg-emerald-500 text-white font-bold rounded-2xl text-sm disabled:opacity-60">
                  I've Arrived 📍
                </button>
              )}
              {activeBooking.status === "arrived" && (
                <button onClick={() => handleStatusUpdate("in_progress")} disabled={processing}
                  className="flex-1 py-3.5 bg-blue-500 text-white font-bold rounded-2xl text-sm disabled:opacity-60">
                  Start Trip 🚀
                </button>
              )}
              {activeBooking.status === "in_progress" && (
                <button onClick={() => handleStatusUpdate("completed")} disabled={processing}
                  className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-2xl text-sm disabled:opacity-60">
                  Complete Trip ✅
                </button>
              )}
              {["assigned", "otw"].includes(activeBooking.status) && (
                <button onClick={handleCancelRide} disabled={processing}
                  className="py-3.5 px-4 border-2 border-red-200 text-red-500 font-bold rounded-2xl text-sm disabled:opacity-60">
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t border-gray-100 flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setScreen(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${screen === id ? "text-emerald-500" : "text-gray-400"}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RiderHistory({ trips, onBack }) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col max-w-md mx-auto overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-lg">‹</span>
        </button>
        <h2 className="font-bold text-gray-900">Trip History</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
        {trips.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Clock className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">No trips yet</p>
          </div>
        ) : trips.map(b => (
          <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-emerald-600 font-semibold">{b.booking_id}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${b.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                {b.status}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-800">{b.customer_name}</div>
            <div className="text-xs text-gray-500 truncate">{b.pickup_address}</div>
            <div className="text-xs text-gray-400 truncate">→ {b.dropoff_address}</div>
            {(b.fare_estimate || b.customer_rating) && (
              <div className="flex items-center justify-between mt-2">
                {b.fare_estimate ? <span className="text-sm font-bold text-emerald-600">₱{b.fare_estimate}</span> : <span />}
                {b.customer_rating ? (
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(n => <span key={n} className="text-xs">{n <= b.customer_rating ? "⭐" : "☆"}</span>)}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RiderProfile({ user, riderData, setRiderData, onBack }) {
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
    <div className="fixed inset-0 bg-white flex flex-col max-w-md mx-auto overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-lg">‹</span>
        </button>
        <h2 className="font-bold text-gray-900">My Profile</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mb-3">🏍</div>
          <div className="font-bold text-gray-900 text-lg">{user?.full_name}</div>
          <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span>{riderData?.avg_rating?.toFixed(1) || "New"}</span>
            <span className="mx-1">·</span>
            <span>{riderData?.completed_trips || 0} trips</span>
          </div>
        </div>
        <div className="space-y-3 mb-6">
          {[
            { label: "Motorcycle Make", key: "motorcycle_make", placeholder: "e.g. Honda" },
            { label: "Motorcycle Model", key: "motorcycle_model", placeholder: "e.g. XRM125" },
            { label: "Plate Number", key: "plate_number", placeholder: "e.g. ABC 1234" },
            { label: "Phone", key: "phone", placeholder: "+63 900 000 0000" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-emerald-400" />
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving || !riderData?.id}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-sm disabled:opacity-60 mb-3">
          {saved ? "Saved! ✓" : saving ? "Saving..." : "Save Changes"}
        </button>
        <button onClick={() => base44.auth.logout()}
          className="w-full py-3 border border-gray-200 text-gray-500 font-medium rounded-2xl text-sm flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}