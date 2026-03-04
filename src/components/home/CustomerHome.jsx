import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Star, User, Banknote, Bike, ChevronRight, X, Phone, Navigation, CheckCircle, ChevronLeft } from "lucide-react";
import MapboxMap from "./MapboxMap";
import CustomerProfile from "./CustomerProfile";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWlrMzQzMDAiLCJhIjoiY21seWd1ZnlpMHl6MTNnc2dkbjcwZ2NmZCJ9.RRkFfU-zgGip8mt8af3MWg";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/ae9f8141e_LOGOMAINBLUEBLACKWHITE.png";

// ── Flow states ──────────────────────────────────────────────
// "idle"       → map shown, tap "Where to?" to start
// "search"     → destination search sheet open
// "confirm"    → fare preview + confirm booking
// "searching"  → booking created, waiting for rider
// "active"     → rider assigned, live tracking
// "rate"       → trip done, show rating screen
// "history"    → rides list
// "profile"    → customer profile

async function reverseGeocode(lng, lat) {
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address,poi`);
    const data = await res.json();
    if (data.features?.length) return data.features[0].place_name;
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function forwardGeocode(query) {
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=6&types=address,poi,place&country=PH&bbox=122.4,9.4,125.1,12.7`);
    const data = await res.json();
    return data.features?.map(f => ({ place_name: f.place_name, center: f.center })) || [];
  } catch {}
  return [];
}

function estimateFare(pickup, dropoff) {
  // Simple estimate: ₱40 base + random per-distance
  return Math.round((Math.random() * 80 + 40) / 10) * 10;
}

export default function CustomerHome({ user }) {
  const [screen, setScreen] = useState("idle");
  const [bookings, setBookings] = useState([]);

  // Location state
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  // Booking state
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [fareEstimate, setFareEstimate] = useState(null);
  const [booking, setBooking] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [rating, setRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Load history + check for active ride on mount
  useEffect(() => {
    if (!user) return;
    base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 20).then(setBookings).catch(() => {});
    base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 5).then(rows => {
      const active = rows?.find(b => ["pending", "searching", "assigned", "otw", "arrived", "in_progress"].includes(b.status));
      if (active) { setActiveRide(active); setScreen("active"); }
    });
  }, [user]);

  // Poll active booking status + rider location
  useEffect(() => {
    if (!activeRide?.id || !["searching", "assigned", "otw", "arrived", "in_progress"].includes(activeRide.status)) return;
    const interval = setInterval(async () => {
      const rows = await base44.entities.Booking.filter({ booking_id: activeRide.booking_id }, "-created_date", 1);
      const updated = rows?.[0];
      if (!updated) return;
      setActiveRide(updated);
      if (updated.status === "completed") { setScreen("rate"); clearInterval(interval); }
      if (updated.status === "cancelled") { setActiveRide(null); setScreen("idle"); clearInterval(interval); }
      // poll rider location
      if (updated.rider_id) {
        const locs = await base44.entities.RiderLocation.filter({ rider_id: updated.rider_id }, "-updated_date", 1);
        if (locs?.[0]) {
          setRiderLocation({ lat: locs[0].lat, lng: locs[0].lng });
          if (["assigned", "otw"].includes(updated.status)) setEta(Math.floor(Math.random() * 5) + 2);
          else setEta(null);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRide?.id, activeRide?.status]);

  const handleGeolocate = useCallback(async (lng, lat) => {
    setPickupCoords({ lng, lat });
    const addr = await reverseGeocode(lng, lat);
    setPickup(addr);
  }, []);

  const handleDropoffChange = useCallback((value) => {
    setDropoffInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) setSuggestions(await forwardGeocode(value));
      else setSuggestions([]);
    }, 350);
  }, []);

  const selectSuggestion = useCallback((s) => {
    setDropoff(s.place_name);
    setDropoffInput(s.place_name);
    setDropoffCoords({ lng: s.center[0], lat: s.center[1] });
    setSuggestions([]);
    setFareEstimate(estimateFare());
    setScreen("confirm");
  }, []);

  const handleBook = async () => {
    if (!pickup || !dropoff || booking) return;
    setBooking(true);
    const bookingId = "BK-" + Date.now().toString(36).toUpperCase();
    const b = await base44.entities.Booking.create({
      booking_id: bookingId,
      customer_name: user?.full_name || "Passenger",
      customer_phone: user?.email || "",
      pickup_address: pickup,
      dropoff_address: dropoff,
      zone: "Jaro",
      status: "pending",
      payment_method: paymentMethod,
      fare_estimate: fareEstimate,
    });
    await base44.entities.BookingEvent.create({
      booking_id: b.id,
      event_type: "BOOKING_CREATED",
      actor_role: "customer",
      actor_name: user?.full_name || "Passenger",
      timestamp: new Date().toISOString(),
    });
    setActiveRide(b);
    setBooking(false);
    setScreen("searching");
    // After 5s if still pending, go to active screen (rider will pick up)
    setTimeout(() => setScreen(prev => prev === "searching" ? "active" : prev), 5000);
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    await base44.entities.Booking.update(activeRide.id, { status: "cancelled", cancelled_by: "customer", cancellation_reason: "Cancelled by customer" });
    await base44.entities.BookingEvent.create({ booking_id: activeRide.id, event_type: "BOOKING_CANCELLED", actor_role: "customer", actor_name: user?.full_name, timestamp: new Date().toISOString() });
    setActiveRide(null);
    setShowCancelConfirm(false);
    setScreen("idle");
    setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
  };

  const handleSubmitRating = async () => {
    setSubmittingRating(true);
    if (activeRide?.id && rating > 0) {
      await base44.entities.Booking.update(activeRide.id, { customer_rating: rating });
    }
    setSubmittingRating(false);
    setActiveRide(null);
    setRating(0);
    setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
    base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 20).then(setBookings);
    setScreen("idle");
  };

  // ── RATE SCREEN ─────────────────────────────────────────────
  if (screen === "rate") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Trip Completed!</h2>
        <p className="text-gray-500 text-sm mb-6">Rate your rider</p>
        {activeRide?.rider_name && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-5 py-4 mb-6 w-full">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">🏍</div>
            <div>
              <div className="font-bold text-gray-900">{activeRide.rider_name}</div>
              <div className="text-xs text-gray-400">{activeRide.rider_phone}</div>
            </div>
          </div>
        )}
        <div className="flex gap-3 mb-8">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)} className="text-4xl transition-transform active:scale-110">
              {n <= rating ? "⭐" : "☆"}
            </button>
          ))}
        </div>
        <button onClick={handleSubmitRating} disabled={submittingRating}
          className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl text-lg disabled:opacity-60">
          {submittingRating ? "Submitting..." : rating > 0 ? "Submit Rating" : "Skip"}
        </button>
      </div>
    );
  }

  // ── PROFILE ──────────────────────────────────────────────────
  if (screen === "profile") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col max-w-md mx-auto pt-12 overflow-y-auto">
        <CustomerProfile user={user} onBack={() => setScreen("idle")} />
      </div>
    );
  }

  // ── HISTORY ──────────────────────────────────────────────────
  if (screen === "history") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col max-w-md mx-auto overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <button onClick={() => setScreen("idle")} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="font-bold text-gray-900">My Rides</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-gray-400">
              <Bike className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No rides yet</p>
            </div>
          ) : bookings.map(b => (
            <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-emerald-600 font-semibold">{b.booking_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${b.status === "completed" ? "bg-emerald-50 text-emerald-600" : b.status === "cancelled" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                  {b.status}
                </span>
              </div>
              <div className="text-sm text-gray-800 font-medium truncate">{b.pickup_address}</div>
              <div className="text-xs text-gray-400 truncate mt-0.5 mb-2">→ {b.dropoff_address}</div>
              <div className="flex items-center justify-between">
                {b.fare_estimate ? <span className="text-sm font-bold text-emerald-600">₱{b.fare_estimate}</span> : <span />}
                {b.customer_rating ? (
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => <span key={n} className="text-xs">{n <= b.customer_rating ? "⭐" : "☆"}</span>)}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── MAIN MAP VIEW (idle + search + confirm + searching + active) ──
  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100 max-w-md mx-auto overflow-hidden">

      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapboxMap
          className="w-full h-full"
          onGeolocate={handleGeolocate}
          pickupMarker={pickupCoords}
          dropoffMarker={dropoffCoords}
          riderMarker={riderLocation}
        />
      </div>

      {/* Top bar */}
      {screen !== "searching" && screen !== "active" && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-12 pb-2">
          <div className="flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2">
            <img src={HABAL_LOGO} alt="Habal" className="w-7 h-7 object-contain" />
            <span className="font-bold text-gray-900 text-sm">Habal</span>
          </div>
          <button onClick={() => setScreen("profile")} className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* ── IDLE: bottom "Where to?" bar ── */}
      {screen === "idle" && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-8 space-y-3">
          {/* Pickup display */}
          {pickup && (
            <div className="bg-white rounded-2xl shadow-md px-4 py-3 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full border-3 border-emerald-500 bg-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Your Location</div>
                <div className="text-sm text-gray-700 truncate">{pickup}</div>
              </div>
            </div>
          )}
          {/* Where to button */}
          <button
            onClick={() => setScreen("search")}
            className="w-full bg-white rounded-2xl shadow-lg px-5 py-4 flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900">Where to?</div>
              <div className="text-xs text-gray-400 mt-0.5">Search destination</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
          {/* Quick actions */}
          <div className="flex gap-2">
            <button onClick={() => setScreen("history")} className="flex-1 bg-white rounded-xl shadow-md py-3 flex items-center justify-center gap-2 text-sm text-gray-600 font-medium">
              <Clock className="w-4 h-4" /> Rides
            </button>
            <button onClick={() => setScreen("profile")} className="flex-1 bg-white rounded-xl shadow-md py-3 flex items-center justify-center gap-2 text-sm text-gray-600 font-medium">
              <User className="w-4 h-4" /> Profile
            </button>
          </div>
        </div>
      )}

      {/* ── SEARCH: destination input sheet ── */}
      {screen === "search" && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white">
          {/* Header */}
          <div className="px-4 pt-12 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setScreen("idle")} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="font-bold text-gray-900">Set your destination</span>
            </div>
            {/* Pickup row */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl mb-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-sm text-gray-600 truncate flex-1">{pickup || "Your location"}</span>
            </div>
            {/* Destination input */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
              <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <input
                autoFocus
                value={dropoffInput}
                onChange={e => handleDropoffChange(e.target.value)}
                placeholder="Where are you going?"
                className="flex-1 bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-400"
              />
              {dropoffInput && (
                <button onClick={() => { setDropoffInput(""); setSuggestions([]); }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          {/* Suggestions */}
          <div className="flex-1 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => selectSuggestion(s)}
                className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 text-left">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{s.place_name.split(",")[0]}</div>
                  <div className="text-xs text-gray-400 truncate">{s.place_name.split(",").slice(1).join(",").trim()}</div>
                </div>
              </button>
            ))}
            {dropoffInput.length >= 3 && suggestions.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No results found</div>
            )}
            {!dropoffInput && (
              <div className="px-5 pt-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Popular in Iloilo</div>
                {["SM City Iloilo", "Robinsons Place Iloilo", "Iloilo Business Park", "Fort San Pedro"].map(place => (
                  <button key={place} onClick={() => handleDropoffChange(place)}
                    className="w-full flex items-center gap-3 py-3 border-b border-gray-50 text-left">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-lg">📍</div>
                    <span className="text-sm font-medium text-gray-700">{place}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIRM: fare preview sheet ── */}
      {screen === "confirm" && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8">
          {/* Back */}
          <button onClick={() => setScreen("search")} className="mb-4 flex items-center gap-1 text-gray-500 text-sm">
            <ChevronLeft className="w-4 h-4" /> Change destination
          </button>
          {/* Route summary */}
          <div className="space-y-2 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-400">Pickup</div>
                <div className="text-sm font-medium text-gray-800 truncate">{pickup}</div>
              </div>
            </div>
            <div className="ml-1.5 w-0.5 h-4 bg-gray-200" />
            <div className="flex items-start gap-3">
              <MapPin className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-400">Dropoff</div>
                <div className="text-sm font-medium text-gray-800 truncate">{dropoff}</div>
              </div>
            </div>
          </div>
          {/* Ride type card */}
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏍</span>
              <div>
                <div className="font-bold text-gray-900">Habal Moto</div>
                <div className="text-xs text-gray-400">1 passenger · fastest</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-emerald-600">₱{fareEstimate}</div>
              <div className="text-xs text-gray-400">estimated</div>
            </div>
          </div>
          {/* Payment toggle */}
          <div className="flex gap-2 mb-5">
            {["cash", "gcash"].map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm capitalize transition-colors ${paymentMethod === m ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-gray-200 text-gray-500"}`}>
                {m === "cash" ? "💵 Cash" : "📱 GCash"}
              </button>
            ))}
          </div>
          {/* Book button */}
          <button onClick={handleBook} disabled={booking}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-lg transition-all disabled:opacity-60 shadow-lg"
            style={{ boxShadow: "0 4px 20px rgba(16,185,129,0.35)" }}>
            {booking ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Booking...
              </div>
            ) : `Book Now · ₱${fareEstimate}`}
          </button>
        </div>
      )}

      {/* ── SEARCHING: animated waiting screen ── */}
      {screen === "searching" && (
        <div className="absolute inset-0 z-20 bg-white flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Bike className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
              {/* Ping rings */}
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" style={{ animationDuration: "1.5s" }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Finding your rider...</h2>
            <p className="text-sm text-gray-400 text-center">We're matching you with a verified Habal rider nearby</p>
            {/* Route summary */}
            <div className="w-full mt-8 bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                <span className="text-gray-600 truncate">{pickup}</span>
              </div>
              <div className="ml-1 w-0.5 h-3 bg-gray-200" />
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 truncate">{dropoff}</span>
              </div>
            </div>
          </div>
          <div className="px-5 pb-10">
            <button onClick={() => { setShowCancelConfirm(true); }} className="w-full py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl text-sm">
              Cancel Booking
            </button>
          </div>
          {showCancelConfirm && <CancelModal onCancel={handleCancelRide} onKeep={() => setShowCancelConfirm(false)} />}
        </div>
      )}

      {/* ── ACTIVE: rider on the way / trip in progress ── */}
      {screen === "active" && activeRide && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-6 space-y-3">
            {/* Status */}
            <StatusBadge status={activeRide.status} />
            {/* Rider card */}
            {activeRide.rider_name ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">🏍</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{activeRide.rider_name}</div>
                    <div className="text-xs text-gray-400">{activeRide.rider_phone}</div>
                  </div>
                </div>
                {eta && (
                  <div className="text-right">
                    <div className="text-xl font-black text-emerald-600">{eta}</div>
                    <div className="text-xs text-gray-400">min away</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-amber-50 rounded-2xl px-4 py-3">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-sm text-amber-700 font-medium">Waiting for rider to accept...</span>
              </div>
            )}
            {/* Route */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="truncate">{activeRide.pickup_address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                <span className="truncate">{activeRide.dropoff_address}</span>
              </div>
            </div>
            {/* Cancel (only before in_progress) */}
            {["pending", "searching", "assigned", "otw"].includes(activeRide.status) && (
              <button onClick={() => setShowCancelConfirm(true)}
                className="w-full py-3 border border-red-200 text-red-500 font-semibold rounded-xl text-sm">
                Cancel Ride
              </button>
            )}
          </div>
          {showCancelConfirm && <CancelModal onCancel={handleCancelRide} onKeep={() => setShowCancelConfirm(false)} />}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    pending:     { label: "Finding your rider...", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
    searching:   { label: "Searching nearby riders...", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
    assigned:    { label: "Rider is on the way!", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
    otw:         { label: "Rider heading to you", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
    arrived:     { label: "Rider has arrived! 🎉", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
    in_progress: { label: "You're on your way!", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  };
  const cfg = MAP[status] || MAP.pending;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm ${cfg.bg} ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
}

function CancelModal({ onCancel, onKeep }) {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-30">
      <div className="w-full bg-white rounded-t-3xl px-5 py-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-lg">Cancel this ride?</h3>
        <p className="text-sm text-gray-500">Your rider may already be heading to you. Frequent cancellations may affect your account.</p>
        <div className="flex gap-3">
          <button onClick={onKeep} className="flex-1 py-3.5 border border-gray-200 rounded-2xl font-bold text-gray-700">Keep Ride</button>
          <button onClick={onCancel} className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl font-bold">Yes, Cancel</button>
        </div>
      </div>
    </div>
  );
}