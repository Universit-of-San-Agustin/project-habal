import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, X, ChevronLeft, ChevronRight, Bike, User, Clock, Wallet, Star, LogOut } from "lucide-react";
import MapboxMap from "./MapboxMap";
import { useToast, ToastContainer } from "./ToastNotification";
import ChatPanel from "../chat/ChatPanel";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWlrMzQzMDAiLCJhIjoiY21seWd1ZnlpMHl6MTNnc2dkbjcwZ2NmZCJ9.RRkFfU-zgGip8mt8af3MWg";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";
const PRIMARY = "#4DC8F0";

// screens: map | search | confirm | searching | active | rate | history | wallet | ratings | profile
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

function estimateFare() {
  return Math.round((Math.random() * 80 + 50) / 10) * 10;
}

// Returns ETA in minutes using Mapbox Directions API
async function fetchETAMinutes(fromLng, fromLat, toLng, toLat) {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${MAPBOX_TOKEN}&overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    const duration = data.routes?.[0]?.duration; // seconds
    if (duration != null) return Math.max(1, Math.round(duration / 60));
  } catch {}
  return null;
}

export default function CustomerHome({ user }) {
  const [screen, setScreen] = useState("map");
  const [bookings, setBookings] = useState([]);
  const { toasts, addToast, dismiss } = useToast();
  const prevStatusRef = useRef(null);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [fareEstimate, setFareEstimate] = useState(null);
  const [booking, setBooking] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(null); // { minutes, label } or null
  const etaTargetRef = useRef(null); // coords to calculate ETA towards
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [rating, setRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!user) return;
    base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 20).then(setBookings).catch(() => {});
    base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 5).then(rows => {
      const active = rows?.find(b => ["pending", "searching", "assigned", "otw", "arrived", "in_progress"].includes(b.status));
      if (active) { setActiveRide(active); setScreen("active"); }
    });
  }, [user]);

  useEffect(() => {
    if (!activeRide?.id || !["searching", "assigned", "otw", "arrived", "in_progress"].includes(activeRide.status)) return;
    const interval = setInterval(async () => {
      const rows = await base44.entities.Booking.filter({ booking_id: activeRide.booking_id }, "-created_date", 1);
      const updated = rows?.[0];
      if (!updated) return;

      // Fetch rider GPS every poll tick
      if (updated.rider_id) {
        const locs = await base44.entities.RiderLocation.filter({ rider_id: updated.rider_id }, "-updated_date", 1).catch(() => []);
        if (locs?.[0]) {
          const loc = { lat: locs[0].lat, lng: locs[0].lng };
          setRiderLocation(loc);

          // Determine ETA target: en-route to pickup → use pickupCoords; in_progress → use dropoffCoords
          const isEnRoutePickup = ["assigned", "otw", "arrived"].includes(updated.status);
          const isInProgress = updated.status === "in_progress";
          const target = etaTargetRef.current;

          if (target && (isEnRoutePickup || isInProgress)) {
            const mins = await fetchETAMinutes(loc.lng, loc.lat, target.lng, target.lat);
            if (mins != null) {
              setEta({
                minutes: mins,
                label: isInProgress ? "to destination" : "to pickup",
              });
            }
          } else if (!isEnRoutePickup && !isInProgress) {
            setEta(null);
          }
        }
      }

      // Fire toast on status change
      if (prevStatusRef.current && prevStatusRef.current !== updated.status) {
        const msgs = {
          assigned:    { type: "rider",    title: "Rider Assigned! 🏍", message: `${updated.rider_name} is on the way` },
          otw:         { type: "rider",    title: "Rider On The Way", message: `${updated.rider_name} is heading to you` },
          arrived:     { type: "location", title: "Rider Arrived! 📍", message: "Your rider is waiting at pickup" },
          in_progress: { type: "info",     title: "Trip Started 🚀", message: "Enjoy your ride!" },
          completed:   { type: "success",  title: "Trip Completed ✅", message: "Please rate your rider" },
          cancelled:   { type: "alert",    title: "Ride Cancelled", message: "Your booking was cancelled" },
        };
        if (msgs[updated.status]) addToast(msgs[updated.status]);

        // Switch ETA target when trip starts
        if (updated.status === "in_progress" && dropoffCoords) {
          etaTargetRef.current = dropoffCoords;
        }
      }
      prevStatusRef.current = updated.status;

      setActiveRide(updated);
      if (updated.status === "completed") { setScreen("rate"); clearInterval(interval); }
      if (updated.status === "cancelled") { setActiveRide(null); setScreen("map"); clearInterval(interval); }
    }, 4000);
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
      booking_id: b.id, event_type: "BOOKING_CREATED",
      actor_role: "customer", actor_name: user?.full_name || "Passenger",
      timestamp: new Date().toISOString(),
    });
    setActiveRide(b);
    setBooking(false);
    setScreen("searching");
    setTimeout(() => setScreen(prev => prev === "searching" ? "active" : prev), 5000);
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    await base44.entities.Booking.update(activeRide.id, { status: "cancelled", cancelled_by: "customer", cancellation_reason: "Cancelled by customer" });
    setActiveRide(null);
    setShowCancelConfirm(false);
    setScreen("map");
    setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
  };

  const handleSubmitRating = async () => {
    setSubmittingRating(true);
    if (activeRide?.id && rating > 0) {
      await base44.entities.Booking.update(activeRide.id, { customer_rating: rating });
    }
    setSubmittingRating(false);
    setActiveRide(null); setRating(0);
    setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
    base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 20).then(setBookings);
    setScreen("map");
  };

  const initials = user?.full_name ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "JD";
  const orderCount = bookings.filter(b => b.status === "completed").length;

  // Screens that show the bottom nav
  const navScreens = ["map", "history", "wallet", "ratings", "profile"];
  const showNav = navScreens.includes(screen);

  // ── RATE ────────────────────────────────────────────────────
  if (screen === "rate") {
    return (
      <AppShell showNav={false}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-4xl">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Trip Completed!</h2>
          <p className="text-gray-400 text-sm mb-6">Rate your rider</p>
          {activeRide?.rider_name && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-5 py-4 mb-6 w-full max-w-xs">
              <div className="w-12 h-12 rounded-full bg-[#4DC8F0]/10 flex items-center justify-center text-2xl">🏍</div>
              <div>
                <div className="font-bold text-gray-900">{activeRide.rider_name}</div>
                <div className="text-xs text-gray-400">{activeRide.rider_phone}</div>
              </div>
            </div>
          )}
          <div className="flex gap-2 mb-8">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} className="text-3xl">
                {n <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
          <button onClick={handleSubmitRating} disabled={submittingRating}
            className="w-full max-w-xs py-4 rounded-full font-semibold text-white disabled:opacity-60"
            style={{ background: PRIMARY }}>
            {submittingRating ? "Submitting..." : rating > 0 ? "Submit Rating" : "Skip"}
          </button>
        </div>
      </AppShell>
    );
  }

  // ── PROFILE ─────────────────────────────────────────────────
  if (screen === "profile") {
    return (
      <AppShell showNav={true} screen={screen} setScreen={setScreen} orderCount={orderCount} initials={initials}>
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-base">User Profile</h2>
          </div>
          <div className="flex flex-col items-center py-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600 mb-2">{initials}</div>
          </div>
          <div className="px-4 py-4 space-y-1">
            <SectionLabel>Personal Information</SectionLabel>
            <InfoRow label="Name" value={user?.full_name || "—"} />
            <InfoRow label="Sex" value="Not Specified" />
            <SectionLabel className="mt-3">Contact Information</SectionLabel>
            <InfoRow label="Mobile Number" value={user?.phone || "+639xxxxxxxxxx"} />
            <InfoRow label="E-mail" value={user?.email || "—"} />
            <SectionLabel className="mt-3">Account Settings</SectionLabel>
            <button className="w-full text-left py-3 text-sm text-red-500 font-medium border-b border-gray-100">Delete Account</button>
          </div>
          <div className="px-4 py-2 space-y-2">
            <button onClick={() => base44.auth.logout(window.location.href)}
              className="w-full py-3 rounded-full font-semibold text-white text-sm"
              style={{ background: PRIMARY }}>
              SIGN OUT
            </button>
            <button className="w-full py-3 rounded-full font-medium text-gray-600 text-sm border border-gray-200">
              Support
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── HISTORY ─────────────────────────────────────────────────
  if (screen === "history") {
    return (
      <AppShell showNav={true} screen={screen} setScreen={setScreen} orderCount={orderCount} initials={initials}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Ride History</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-300">
              <Bike className="w-10 h-10 mb-2" />
              <p className="text-sm">No rides yet</p>
            </div>
          ) : bookings.map(b => (
            <div key={b.id} className="border-b border-gray-100 py-3">
              <div className="flex justify-between items-start mb-1">
                <div className="text-sm font-medium text-gray-800 truncate flex-1 mr-2">{b.pickup_address}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${b.status === "completed" ? "bg-green-50 text-green-600" : b.status === "cancelled" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>{b.status}</span>
              </div>
              <div className="text-xs text-gray-400 truncate mb-1">{b.dropoff_address || "Locating address..."}</div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>{b.created_date ? new Date(b.created_date).toLocaleString() : ""}</span>
                {b.fare_estimate && <span className="font-bold text-gray-700">₱{b.fare_estimate}.00</span>}
              </div>
            </div>
          ))}
        </div>
      </AppShell>
    );
  }

  // ── WALLET ───────────────────────────────────────────────────
  if (screen === "wallet") {
    return (
      <AppShell showNav={true} screen={screen} setScreen={setScreen} orderCount={orderCount} initials={initials}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">WALLET BALANCE</h2>
        </div>
        <div className="flex flex-col items-center py-10">
          <div className="text-4xl font-bold text-gray-900 mb-1">₱0.00</div>
          <div className="text-sm text-gray-400">Available Balance</div>
        </div>
        <div className="px-4">
          <SectionLabel>Transaction History</SectionLabel>
          <div className="flex flex-col items-center py-10 text-gray-300">
            <Wallet className="w-10 h-10 mb-2" />
            <p className="text-sm">No transactions yet</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── RATINGS ──────────────────────────────────────────────────
  if (screen === "ratings") {
    const rated = bookings.filter(b => b.customer_rating);
    return (
      <AppShell showNav={true} screen={screen} setScreen={setScreen} orderCount={orderCount} initials={initials}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">My Ratings</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {rated.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-300">
              <Star className="w-10 h-10 mb-2" />
              <p className="text-sm">No ratings yet</p>
            </div>
          ) : rated.map(b => (
            <div key={b.id} className="border-b border-gray-100 py-3 flex justify-between items-center">
              <div className="text-sm text-gray-700 truncate flex-1 mr-3">{b.pickup_address}</div>
              <div className="flex">{[1,2,3,4,5].map(n => <span key={n} className={`text-sm ${n <= b.customer_rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>)}</div>
            </div>
          ))}
        </div>
      </AppShell>
    );
  }

  // ── MAP: map + search + confirm + searching + active ─────────
  return (
    <AppShell showNav={showNav} screen={screen} setScreen={setScreen} orderCount={orderCount} initials={initials} noScroll>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Map */}
      <div className="absolute inset-0" style={{ bottom: showNav ? 64 : 0 }}>
        <MapboxMap className="w-full h-full" onGeolocate={handleGeolocate}
          pickupMarker={pickupCoords} dropoffMarker={dropoffCoords} riderMarker={riderLocation} />
      </div>

      {/* Top header on map */}
      {screen === "map" && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-10 pb-2 pointer-events-none">
          <img src={HABAL_LOGO} alt="Habal" className="w-10 h-10 object-contain pointer-events-auto"
            onError={e => { e.target.style.display="none"; }} />
          <button onClick={() => setScreen("profile")} className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center pointer-events-auto">
            <span className="text-xs font-bold text-gray-700">{initials}</span>
          </button>
        </div>
      )}

      {/* IDLE booking bar */}
      {screen === "map" && (
        <div className="absolute bottom-16 left-0 right-0 z-10 px-4 pb-2">
          {pickup && (
            <div className="bg-white rounded-2xl shadow-md px-4 py-3 flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PRIMARY }}>Pick Up</div>
                <div className="text-sm text-gray-700 truncate">{pickup}</div>
              </div>
            </div>
          )}
          <button onClick={() => setScreen("search")}
            className="w-full bg-white rounded-2xl shadow-lg px-5 py-4 flex items-center gap-3 text-left mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY }}>
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</div>
              <div className="text-sm font-medium text-gray-400">Where to?</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      )}

      {/* SEARCH sheet */}
      {screen === "search" && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white" style={{ top: 0, bottom: 0 }}>
          <div className="px-4 pt-12 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setScreen("map")} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="font-bold text-gray-900">Set Destination</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl mb-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
              <span className="text-sm text-gray-500 truncate">{pickup || "Your location"}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
              <input autoFocus value={dropoffInput} onChange={e => handleDropoffChange(e.target.value)}
                placeholder="Where are you going?" className="flex-1 bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-400" />
              {dropoffInput && <button onClick={() => { setDropoffInput(""); setSuggestions([]); }}><X className="w-4 h-4 text-gray-400" /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => selectSuggestion(s)} className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 text-left">
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
                  <button key={place} onClick={() => handleDropoffChange(place)} className="w-full flex items-center gap-3 py-3 border-b border-gray-50 text-left">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#EBF9FE" }}>
                      <MapPin className="w-4 h-4" style={{ color: PRIMARY }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{place}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM sheet */}
      {screen === "confirm" && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-8">
          <button onClick={() => setScreen("search")} className="mb-3 flex items-center gap-1 text-gray-400 text-sm">
            <ChevronLeft className="w-4 h-4" /> Change destination
          </button>
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: PRIMARY }} />
              <div><div className="text-xs text-gray-400">PICK UP</div><div className="text-sm font-medium text-gray-800 truncate">{pickup}</div></div>
            </div>
            <div className="ml-1.5 w-0.5 h-3 bg-gray-200" />
            <div className="flex items-start gap-3">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: PRIMARY }} />
              <div><div className="text-xs text-gray-400">DESTINATION</div><div className="text-sm font-medium text-gray-800 truncate">{dropoff}</div></div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏍</span>
              <div>
                <div className="font-bold text-gray-900 text-sm">Motorcycle</div>
                <div className="text-xs text-gray-400">1 passenger · fastest</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black" style={{ color: PRIMARY }}>₱{fareEstimate}</div>
              <div className="text-xs text-gray-400">estimated</div>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {["cash", "gcash"].map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm capitalize transition-colors`}
                style={paymentMethod === m ? { borderColor: PRIMARY, background: "#EBF9FE", color: PRIMARY } : { borderColor: "#e5e7eb", color: "#6b7280" }}>
                {m === "cash" ? "💵 Cash" : "📱 GCash"} {m === "cash" && <span className="text-xs font-normal ml-1">Now</span>}
              </button>
            ))}
          </div>
          <button onClick={handleBook} disabled={booking}
            className="w-full py-4 rounded-full font-bold text-white text-base disabled:opacity-60"
            style={{ background: PRIMARY, boxShadow: `0 4px 15px rgba(77,200,240,0.4)` }}>
            {booking ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : `Book Now · ₱${fareEstimate}`}
          </button>
        </div>
      )}

      {/* SEARCHING */}
      {screen === "searching" && (
        <div className="absolute inset-0 z-20 bg-white flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "#EBF9FE" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#D6F3FC" }}>
                  <Bike className="w-8 h-8" style={{ color: PRIMARY }} />
                </div>
              </div>
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(77,200,240,0.2)", animationDuration: "1.5s" }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Finding your rider...</h2>
            <p className="text-sm text-gray-400 text-center">We're matching you with a verified Habal rider nearby</p>
            <div className="w-full mt-8 bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: PRIMARY }} />
                <span className="text-gray-600 truncate">{pickup}</span>
              </div>
              <div className="ml-1 w-0.5 h-3 bg-gray-200" />
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: PRIMARY }} />
                <span className="text-gray-600 truncate">{dropoff}</span>
              </div>
            </div>
          </div>
          <div className="px-5 pb-10">
            <button onClick={() => setShowCancelConfirm(true)} className="w-full py-3 border border-gray-200 text-gray-500 font-semibold rounded-full text-sm">Cancel Booking</button>
          </div>
          {showCancelConfirm && <CancelModal onCancel={handleCancelRide} onKeep={() => setShowCancelConfirm(false)} />}
        </div>
      )}

      {/* ACTIVE */}
      {screen === "active" && activeRide && (
        <div className="absolute bottom-16 left-0 right-0 z-20">
          <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-5 space-y-3">
            <RideStatusBadge status={activeRide.status} />
            {activeRide.rider_name ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: "#EBF9FE" }}>🏍</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{activeRide.rider_name}</div>
                    <div className="text-xs text-gray-400">{activeRide.rider_phone}</div>
                  </div>
                </div>
                {eta && <div className="text-right"><div className="text-xl font-black" style={{ color: PRIMARY }}>{eta}</div><div className="text-xs text-gray-400">min away</div></div>}
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-blue-50 rounded-2xl px-4 py-3">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
                <span className="text-sm font-medium" style={{ color: PRIMARY }}>Waiting for rider to accept...</span>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                <span className="truncate">{activeRide.pickup_address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: PRIMARY }} />
                <span className="truncate">{activeRide.dropoff_address}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {activeRide.rider_name && (
                <button onClick={() => setShowChat(true)}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                  style={{ background: PRIMARY }}>
                  💬 Chat Rider
                </button>
              )}
              {["pending", "searching", "assigned", "otw"].includes(activeRide.status) && (
                <button onClick={() => setShowCancelConfirm(true)} className="flex-1 py-2.5 border border-red-200 text-red-500 font-semibold rounded-xl text-sm">Cancel Ride</button>
              )}
            </div>
      {showChat && activeRide && (
              <ChatPanel bookingId={activeRide.booking_id || activeRide.id} currentUser={user} senderRole="customer" onClose={() => setShowChat(false)} />
            )}
          </div>
          {showCancelConfirm && <CancelModal onCancel={handleCancelRide} onKeep={() => setShowCancelConfirm(false)} />}
        </div>
      )}
    </AppShell>
  );
}

// ── Shell with bottom nav ────────────────────────────────────
function AppShell({ children, showNav, screen, setScreen, orderCount, initials, noScroll }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-white max-w-md mx-auto overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      <div className={`flex-1 relative ${noScroll ? "" : "overflow-y-auto"}`}>
        {children}
      </div>
      {showNav && (
        <BottomNav screen={screen} setScreen={setScreen} orderCount={orderCount} initials={initials} />
      )}
    </div>
  );
}

function BottomNav({ screen, setScreen, orderCount, initials }) {
  const tabs = [
    { id: "map", label: "Book Rides", icon: <Bike className="w-5 h-5" /> },
    { id: "wallet", label: "Wallet", icon: <Wallet className="w-5 h-5" /> },
    { id: "ratings", label: "Ratings", icon: <Star className="w-5 h-5" /> },
    { id: "exit", label: "Exit", icon: <LogOut className="w-5 h-5" /> },
  ];
  return (
    <div className="flex items-center justify-around border-t border-gray-100 bg-white px-2 py-2" style={{ height: 64 }}>
      {/* order count badge */}
      {orderCount > 0 && (
        <div className="absolute bottom-14 left-4 bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">{orderCount} Order</div>
      )}
      {tabs.map(t => {
        const active = screen === t.id;
        if (t.id === "exit") {
          return (
            <button key={t.id} onClick={() => base44.auth.logout(window.location.href)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-400 text-xs">
              <LogOut className="w-5 h-5" />
              <span>Exit</span>
            </button>
          );
        }
        return (
          <button key={t.id} onClick={() => setScreen(t.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors"
            style={active ? { color: "#4DC8F0" } : { color: "#9ca3af" }}>
            {t.icon}
            <span className="font-medium">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function RideStatusBadge({ status }) {
  const MAP = {
    pending:     { label: "Finding your rider...", bg: "#FFF7ED", color: "#d97706" },
    searching:   { label: "Searching nearby riders...", bg: "#FFF7ED", color: "#d97706" },
    assigned:    { label: "Rider is on the way!", bg: "#EBF9FE", color: "#0369a1" },
    otw:         { label: "Rider heading to you", bg: "#EBF9FE", color: "#0369a1" },
    arrived:     { label: "Rider has arrived! 🎉", bg: "#F0FDF4", color: "#15803d" },
    in_progress: { label: "You're on your way!", bg: "#EFF6FF", color: "#1d4ed8" },
  };
  const cfg = MAP[status] || MAP.pending;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.color }} />
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
          <button onClick={onKeep} className="flex-1 py-3.5 border border-gray-200 rounded-full font-bold text-gray-700">Keep Ride</button>
          <button onClick={onCancel} className="flex-1 py-3.5 bg-red-500 text-white rounded-full font-bold">Yes, Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, className = "" }) {
  return <div className={`text-xs font-semibold text-gray-400 uppercase tracking-wider pt-3 pb-1 ${className}`}>{children}</div>;
}
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}