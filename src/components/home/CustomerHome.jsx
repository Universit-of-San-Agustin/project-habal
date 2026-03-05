import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  MapPin, X, ChevronLeft, ChevronRight, Bike, User, Clock,
  Wallet, Star, LogOut, MessageCircle, Home, Phone, Shield,
  Bell, Settings, ChevronDown, Plus, Check,
  Navigation, Send, CreditCard, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import MapboxMap from "./MapboxMap";
import { useToast, ToastContainer } from "./ToastNotification";
import ChatPanel from "../chat/ChatPanel";
import WalletScreen from "../customer/WalletScreen";
import SupportScreen from "../customer/SupportScreen";
import NotificationsPanel from "../customer/NotificationsPanel";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWlrMzQzMDAiLCJhIjoiY21seWd1ZnlpMHl6MTNnc2dkbjcwZ2NmZCJ9.RRkFfU-zgGip8mt8af3MWg";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";
const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

// ── Utilities ─────────────────────────────────────────────────
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

async function fetchETAMinutes(fromLng, fromLat, toLng, toLat) {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${MAPBOX_TOKEN}&overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    const duration = data.routes?.[0]?.duration;
    if (duration != null) return Math.max(1, Math.round(duration / 60));
  } catch {}
  return null;
}

function detectZone(address) {
  const a = (address || "").toLowerCase();
  if (a.includes("jaro")) return "Jaro";
  if (a.includes("mandurriao")) return "Mandurriao";
  if (a.includes("la paz") || a.includes("lapaz")) return "La Paz";
  if (a.includes("arevalo")) return "Arevalo";
  if (a.includes("city proper") || a.includes("iloilo city")) return "City Proper";
  return "City Proper";
}

// ── Main Component ────────────────────────────────────────────
export default function CustomerHome({ user }) {
  // screen: map | search | confirm | searching | active | rate | history | wallet | messages | profile | saved | support
  const [screen, setScreen] = useState("map");
  const [bookings, setBookings] = useState([]);
  const { toasts, addToast, dismiss } = useToast();
  const prevStatusRef = useRef(null);

  // Booking
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
  const [eta, setEta] = useState(null);
  const etaTargetRef = useRef(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [rating, setRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Support chat
  const [supportMessages, setSupportMessages] = useState([
    { id: 1, from: "support", text: "Hi! How can we help you today?", time: "Now" }
  ]);
  const [supportInput, setSupportInput] = useState("");

  // Saved locations
  const [savedLocations] = useState([
    { id: 1, label: "Home", icon: "🏠", address: "123 Rizal St, Jaro, Iloilo City" },
    { id: 2, label: "Work", icon: "💼", address: "Iloilo Business Park, Mandurriao" },
  ]);

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

      if (updated.rider_id) {
        const locs = await base44.entities.RiderLocation.filter({ rider_id: updated.rider_id }, "-updated_date", 1).catch(() => []);
        if (locs?.[0]) {
          const loc = { lat: locs[0].lat, lng: locs[0].lng };
          setRiderLocation(loc);
          const isEnRoutePickup = ["assigned", "otw", "arrived"].includes(updated.status);
          const isInProgress = updated.status === "in_progress";
          const target = etaTargetRef.current;
          if (target && (isEnRoutePickup || isInProgress)) {
            const mins = await fetchETAMinutes(loc.lng, loc.lat, target.lng, target.lat);
            if (mins != null) setEta({ minutes: mins, label: isInProgress ? "to destination" : "to pickup" });
          } else if (!isEnRoutePickup && !isInProgress) {
            setEta(null);
          }
        }
      }

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
        if (updated.status === "in_progress" && dropoffCoords) etaTargetRef.current = dropoffCoords;
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
    const detectedZone = detectZone(pickup);
    const b = await base44.entities.Booking.create({
      booking_id: bookingId,
      customer_name: user?.full_name || "Passenger",
      customer_phone: user?.email || "",
      pickup_address: pickup,
      dropoff_address: dropoff,
      zone: detectedZone,
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
    if (pickupCoords) etaTargetRef.current = pickupCoords;
    setScreen("searching");
    base44.functions.invoke("matchRider", { booking_id: bookingId }).catch(() => {});
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

  const sendSupportMessage = () => {
    if (!supportInput.trim()) return;
    const msg = { id: Date.now(), from: "user", text: supportInput.trim(), time: "Now" };
    setSupportMessages(m => [...m, msg]);
    setSupportInput("");
    setTimeout(() => {
      setSupportMessages(m => [...m, {
        id: Date.now() + 1, from: "support",
        text: "Thanks for reaching out! A support agent will respond shortly.", time: "Now"
      }]);
    }, 1200);
  };

  const initials = user?.full_name ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "JD";
  const completedRides = bookings.filter(b => b.status === "completed").length;
  const navScreens = ["map", "history", "wallet", "messages", "profile"];
  const showNav = navScreens.includes(screen);

  // ── RATE ────────────────────────────────────────────────────
  if (screen === "rate") {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center px-8 fade-in">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: PRIMARY_BG }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "#D6F3FC" }}>
                <span className="text-4xl">🎉</span>
              </div>
            </div>
            <div className="absolute -right-1 -bottom-1 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: PRIMARY }}>
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">You've arrived!</h2>
          <p className="text-gray-400 text-sm mb-2 text-center">How was your ride? Rate your experience</p>
          {activeRide?.fare_estimate && (
            <div className="px-5 py-2.5 rounded-full mb-6 text-sm font-bold" style={{ background: PRIMARY_BG, color: PRIMARY_DARK }}>
              Trip fare: ₱{activeRide.fare_estimate}
            </div>
          )}
          {activeRide?.rider_name && (
            <div className="flex items-center gap-4 bg-gray-50 rounded-3xl px-5 py-4 mb-6 w-full max-w-xs">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: PRIMARY_BG }}>🏍</div>
              <div>
                <div className="font-bold text-gray-900">{activeRide.rider_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">Your rider</div>
                <div className="flex mt-1">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`text-xs ${n <= 4 ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 mb-8">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all"
                style={n <= rating ? { background: PRIMARY, boxShadow: `0 4px 12px rgba(77,200,240,0.4)` } : { background: "#f3f4f6" }}>
                <span style={{ filter: n <= rating ? "brightness(10)" : "none" }}>⭐</span>
              </button>
            ))}
          </div>
          <PrimaryBtn onClick={handleSubmitRating} loading={submittingRating}>
            {rating > 0 ? "Submit Rating" : "Skip for Now"}
          </PrimaryBtn>
        </div>
      </Shell>
    );
  }

  // ── SUPPORT ──────────────────────────────────────────────────
  if (screen === "support") {
    return (
      <Shell>
        <SupportScreen user={user} onBack={() => setScreen("profile")} />
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────
  if (screen === "notifications") {
    return (
      <Shell>
        <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100 bg-white">
          <button onClick={() => setScreen("map")} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Notifications</h1>
        </div>
        <NotificationsPanel user={user} />
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── MESSAGES ─────────────────────────────────────────────────
  if (screen === "messages") {
    const rideWithRider = bookings.find(b => b.rider_name && ["assigned","otw","arrived","in_progress","completed"].includes(b.status));
    return (
      <Shell>
        <ScreenHeader title="Messages" />
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-3">
            <div className="bg-gray-50 rounded-2xl px-4 py-2.5 flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-400">Search messages...</span>
            </div>
          </div>
          {/* Support */}
          <button onClick={() => setScreen("support")}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY_BG }}>
              <Shield className="w-6 h-6" style={{ color: PRIMARY }} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 text-sm">Habal Support</div>
              <div className="text-xs text-gray-400 mt-0.5 truncate">Hi! How can we help you today?</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">Now</span>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: PRIMARY }}>1</div>
            </div>
          </button>
          {/* Active ride chat */}
          {rideWithRider && (
            <button onClick={() => { setActiveRide(rideWithRider); setShowChat(true); }}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#f0fdf4" }}>
                <span className="text-2xl">🏍</span>
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 text-sm">{rideWithRider.rider_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">Your rider · Tap to chat</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          )}
          {!rideWithRider && (
            <div className="flex flex-col items-center py-16 text-gray-300">
              <MessageCircle className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">No rider chats yet</p>
              <p className="text-xs mt-1 text-gray-300">Book a ride to chat with your rider</p>
            </div>
          )}
        </div>
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── SAVED LOCATIONS ──────────────────────────────────────────
  if (screen === "saved") {
    return (
      <Shell>
        <ScreenHeader title="Saved Locations" onBack={() => setScreen("profile")} />
        <div className="flex-1 overflow-y-auto px-4 pt-4">
          {savedLocations.map(loc => (
            <div key={loc.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-4 py-4 mb-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: PRIMARY_BG }}>
                {loc.icon}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">{loc.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{loc.address}</div>
              </div>
              <button className="text-gray-300 hover:text-gray-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:border-blue-200 hover:text-blue-400 transition-colors">
            <Plus className="w-4 h-4" /> Add New Location
          </button>
        </div>
      </Shell>
    );
  }

  // ── PROFILE ─────────────────────────────────────────────────
  if (screen === "profile") {
    return (
      <Shell>
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Hero */}
          <div className="px-4 pt-14 pb-6 relative" style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-bold text-white">
                {initials}
              </div>
              <div>
                <div className="font-bold text-white text-lg leading-tight">{user?.full_name || "Customer"}</div>
                <div className="text-blue-100 text-xs mt-0.5">{user?.email}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-[10px] font-semibold">{completedRides} Rides</span>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-[10px] font-semibold">⭐ Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="px-4 py-4 space-y-2">
            {[
              { icon: "👤", label: "Personal Information", sub: "Name, phone, email", screen: null },
              { icon: "📍", label: "Saved Locations", sub: "Home, work, favorites", screen: "saved" },
              { icon: "🔔", label: "Notifications", sub: "Alerts & updates", screen: "notifications" },
              { icon: "🛡", label: "Help & Support", sub: "FAQ, tickets, contact", screen: "support" },
              { icon: "⭐", label: "My Ratings", sub: `${bookings.filter(b=>b.customer_rating).length} reviews given`, screen: null },
              { icon: "⚙️", label: "Settings", sub: "App preferences", screen: null },
            ].map((item, i) => (
              <button key={i} onClick={() => item.screen && setScreen(item.screen)}
                className="w-full flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: PRIMARY_BG }}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">{item.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>

          <div className="px-4 pb-4 space-y-2">
            <button onClick={() => base44.auth.logout(window.location.href)}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── HISTORY ─────────────────────────────────────────────────
  if (screen === "history") {
    return (
      <Shell>
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="px-4 pt-12 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">Ride History</h1>
            <p className="text-sm text-gray-400 mt-0.5">{completedRides} completed rides</p>
          </div>
          {/* Stats row */}
          <div className="px-4 mb-4 grid grid-cols-3 gap-3">
            {[
              { label: "Completed", value: completedRides, color: "#10b981" },
              { label: "Cancelled", value: bookings.filter(b => b.status === "cancelled").length, color: "#ef4444" },
              { label: "Total", value: bookings.length, color: PRIMARY },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
                <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="px-4 space-y-3 pb-4">
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-gray-300">
                <Bike className="w-16 h-16 mb-4 opacity-30" />
                <p className="font-semibold text-gray-400">No rides yet</p>
                <p className="text-sm text-gray-300 mt-1">Book your first ride!</p>
                <button onClick={() => setScreen("map")} className="mt-5 px-6 py-2.5 rounded-full text-white text-sm font-semibold"
                  style={{ background: PRIMARY }}>
                  Book a Ride
                </button>
              </div>
            ) : bookings.map(b => (
              <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: PRIMARY_BG }}>🏍</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm font-mono">{b.booking_id || b.id?.slice(0, 8)}</div>
                      <div className="text-xs text-gray-400">{b.created_date ? new Date(b.created_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                    </div>
                  </div>
                  <StatusPill status={b.status} />
                </div>
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                    <span className="truncate">{b.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                    <span className="truncate">{b.dropoff_address}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="text-xs text-gray-400">{b.payment_method?.toUpperCase() || "CASH"}</div>
                  {b.fare_estimate && <div className="font-black text-gray-900">₱{b.fare_estimate}</div>}
                  {b.customer_rating && (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => <span key={n} className={`text-xs ${n <= b.customer_rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── WALLET ───────────────────────────────────────────────────
  if (screen === "wallet") {
    return (
      <Shell>
        <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100 bg-white">
          <h1 className="font-bold text-gray-900 text-lg">Wallet</h1>
        </div>
        <WalletScreen user={user} bookings={bookings} />
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── MAP + BOOKING SCREENS ────────────────────────────────────
  return (
    <Shell noScroll>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Map */}
      <div className="absolute inset-0" style={{ bottom: showNav ? 64 : 0 }}>
        <MapboxMap className="w-full h-full" onGeolocate={handleGeolocate}
          pickupMarker={pickupCoords} dropoffMarker={dropoffCoords} riderMarker={riderLocation} />
      </div>

      {/* Map Top Header */}
      {screen === "map" && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2">
              <img src={HABAL_LOGO} alt="Habal" className="w-7 h-7 object-contain" onError={e => { e.target.style.display="none"; }} />
              <div>
                <div className="text-xs text-gray-400 leading-none">Good day,</div>
                <div className="text-sm font-bold text-gray-900 leading-tight">{user?.full_name?.split(" ")[0] || "Rider"}</div>
              </div>
            </div>
            <button onClick={() => setScreen("profile")}
              className="w-10 h-10 rounded-2xl shadow-md flex items-center justify-center font-bold text-sm text-white"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
              {initials}
            </button>
          </div>
        </div>
      )}

      {/* Map Bottom Bar */}
      {screen === "map" && (
        <div className="absolute bottom-16 left-0 right-0 z-10 px-4 pb-2">
          {pickup && (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 mb-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: PRIMARY }}>Pick Up</div>
                <div className="text-sm text-gray-700 truncate">{pickup}</div>
              </div>
            </div>
          )}
          <button onClick={() => setScreen("search")}
            className="w-full bg-white rounded-2xl shadow-lg px-4 py-4 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Destination</div>
              <div className="text-sm font-semibold text-gray-500 mt-0.5">Where to?</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      )}

      {/* SEARCH SCREEN */}
      {screen === "search" && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white">
          <div className="px-4 pt-12 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setScreen("map")}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="font-bold text-gray-900">Set Destination</span>
            </div>
            {/* Pickup */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl mb-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
              <span className="text-sm text-gray-500 truncate">{pickup || "Your location"}</span>
            </div>
            {/* Dropoff input */}
            <div className="flex items-center gap-3 px-3 py-2.5 border-2 rounded-xl" style={{ borderColor: PRIMARY }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
              <input autoFocus value={dropoffInput} onChange={e => handleDropoffChange(e.target.value)}
                placeholder="Where are you going?"
                className="flex-1 bg-transparent text-sm text-gray-800 focus:outline-none placeholder-gray-400" />
              {dropoffInput && (
                <button onClick={() => { setDropoffInput(""); setSuggestions([]); }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Suggestions */}
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => selectSuggestion(s)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 text-left">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{s.place_name.split(",")[0]}</div>
                  <div className="text-xs text-gray-400 truncate">{s.place_name.split(",").slice(1).join(",").trim()}</div>
                </div>
              </button>
            ))}
            {dropoffInput.length >= 3 && suggestions.length === 0 && (
              <div className="px-5 py-10 text-center">
                <div className="text-gray-300 text-sm">No results for "{dropoffInput}"</div>
              </div>
            )}
            {/* Popular places */}
            {!dropoffInput && (
              <div className="px-4 pt-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Popular in Iloilo</div>
                {[
                  { name: "SM City Iloilo", icon: "🏬", sub: "Mandurriao, Iloilo City" },
                  { name: "Robinsons Place Iloilo", icon: "🛍", sub: "Gaisano, Iloilo City" },
                  { name: "Iloilo Business Park", icon: "🏢", sub: "Mandurriao, Iloilo City" },
                  { name: "Fort San Pedro", icon: "🏰", sub: "Molo, Iloilo City" },
                  { name: "Iloilo City Hall", icon: "🏛", sub: "City Proper, Iloilo City" },
                ].map(place => (
                  <button key={place.name} onClick={() => handleDropoffChange(place.name)}
                    className="w-full flex items-center gap-3 py-3.5 border-b border-gray-50 text-left">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: PRIMARY_BG }}>
                      {place.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{place.name}</div>
                      <div className="text-xs text-gray-400">{place.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM SCREEN */}
      {screen === "confirm" && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl slide-up">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setScreen("search")} className="flex items-center gap-1 text-sm font-medium" style={{ color: PRIMARY }}>
                <ChevronLeft className="w-4 h-4" /> Change
              </button>
              <h3 className="font-bold text-gray-900">Confirm Ride</h3>
              <div className="w-16" />
            </div>
            {/* Route */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: PRIMARY }} />
                  <div className="w-0.5 h-5 bg-gray-200" />
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pick Up</div>
                    <div className="text-sm font-medium text-gray-800 leading-snug">{pickup}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destination</div>
                    <div className="text-sm font-medium text-gray-800 leading-snug">{dropoff}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Ride type + fare */}
            <div className="flex items-center justify-between border-2 rounded-2xl px-4 py-3.5 mb-4" style={{ borderColor: PRIMARY + "40" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: PRIMARY_BG }}>🏍</div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Motorcycle</div>
                  <div className="text-xs text-gray-400">1 passenger · fastest</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black" style={{ color: PRIMARY }}>₱{fareEstimate}</div>
                <div className="text-[10px] text-gray-400">estimated fare</div>
              </div>
            </div>
            {/* Payment */}
            <div className="mb-5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Method</div>
              <div className="flex gap-2">
                {[{ id: "cash", label: "💵 Cash", sub: "Pay on arrival" }, { id: "gcash", label: "📱 GCash", sub: "Digital wallet" }].map(m => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all`}
                    style={paymentMethod === m.id
                      ? { borderColor: PRIMARY, background: PRIMARY_BG, color: PRIMARY_DARK }
                      : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                    <div>{m.label}</div>
                    <div className="text-[10px] font-normal mt-0.5">{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <PrimaryBtn onClick={handleBook} loading={booking}>
              {booking ? "Booking..." : `Book Now · ₱${fareEstimate}`}
            </PrimaryBtn>
          </div>
        </div>
      )}

      {/* SEARCHING */}
      {screen === "searching" && (
        <div className="absolute inset-0 z-20 bg-white flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center px-8 fade-in">
            <div className="relative mb-10">
              <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: PRIMARY_BG }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "#D6F3FC" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: PRIMARY }}>
                    <Bike className="w-9 h-9 text-white" />
                  </div>
                </div>
              </div>
              {[1, 1.6, 2.2].map((delay, i) => (
                <div key={i} className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: `rgba(77,200,240,${0.15 - i * 0.04})`, animationDelay: `${delay * 0.4}s`, animationDuration: "2s" }} />
              ))}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Finding your rider...</h2>
            <p className="text-sm text-gray-400 text-center mb-8">We're matching you with a verified Habal rider in your area</p>
            <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: PRIMARY }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pickup</div>
                  <div className="text-sm text-gray-700 truncate">{pickup}</div>
                </div>
              </div>
              <div className="ml-1 w-0.5 h-3 bg-gray-200" />
              <div className="flex items-start gap-3">
                <MapPin className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Destination</div>
                  <div className="text-sm text-gray-700 truncate">{dropoff}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 pb-10">
            <button onClick={() => setShowCancelConfirm(true)}
              className="w-full py-3.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-2xl text-sm">
              Cancel Booking
            </button>
          </div>
          {showCancelConfirm && <CancelModal onCancel={handleCancelRide} onKeep={() => setShowCancelConfirm(false)} />}
        </div>
      )}

      {/* ACTIVE RIDE */}
      {screen === "active" && activeRide && (
        <div className="absolute bottom-16 left-0 right-0 z-20 slide-up">
          <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-5 space-y-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />
            <RideStatusBadge status={activeRide.status} />
            {activeRide.rider_name ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: PRIMARY_BG }}>🏍</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{activeRide.rider_name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-yellow-500">⭐</span>
                      <span className="text-xs text-gray-400">Verified Rider</span>
                    </div>
                  </div>
                </div>
                {eta && (
                  <div className="text-right">
                    <div className="text-xl font-black" style={{ color: PRIMARY }}>{eta.minutes}<span className="text-sm font-semibold ml-0.5">min</span></div>
                    <div className="text-[10px] text-gray-400">{eta.label}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: PRIMARY_BG }}>
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
                  style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
                <span className="text-sm font-semibold" style={{ color: PRIMARY_DARK }}>Waiting for a rider to accept...</span>
              </div>
            )}
            {/* Route summary */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                <span className="truncate">{activeRide.pickup_address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">{activeRide.dropoff_address}</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {activeRide.rider_name && (
                <button onClick={() => setShowChat(true)}
                  className="flex-1 py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5"
                  style={{ background: PRIMARY }}>
                  <MessageCircle className="w-4 h-4" /> Chat Rider
                </button>
              )}
              {["pending", "searching", "assigned", "otw"].includes(activeRide.status) && (
                <button onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 py-3 border-2 border-red-100 text-red-400 font-bold rounded-2xl text-sm">
                  Cancel
                </button>
              )}
            </div>
            {showChat && activeRide && (
              <ChatPanel bookingId={activeRide.booking_id || activeRide.id} currentUser={user} senderRole="customer" onClose={() => setShowChat(false)} />
            )}
          </div>
          {showCancelConfirm && <CancelModal onCancel={handleCancelRide} onKeep={() => setShowCancelConfirm(false)} />}
        </div>
      )}

      {showNav && <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />}
    </Shell>
  );
}

// ── Shell ─────────────────────────────────────────────────────
function Shell({ children, noScroll }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-white max-w-md mx-auto overflow-hidden">
      <div className={`flex-1 relative ${noScroll ? "" : "overflow-y-auto"}`}>
        {children}
      </div>
    </div>
  );
}

// ── ScreenHeader ──────────────────────────────────────────────
function ScreenHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100">
      {onBack && (
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      )}
      <h1 className="font-bold text-gray-900 text-lg">{title}</h1>
    </div>
  );
}

// ── BottomNav ─────────────────────────────────────────────────
function BottomNav({ screen, setScreen, completedRides }) {
  const tabs = [
    { id: "map",      label: "Home",     icon: Home },
    { id: "wallet",   label: "Wallet",   icon: Wallet },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "profile",  label: "Profile",  icon: User },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex px-2 pb-2 pt-1"
      style={{ height: 64, boxShadow: "0 -4px 20px rgba(77,200,240,0.08)" }}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = screen === id || (id === "map" && ["search","confirm","searching","active"].includes(screen));
        return (
          <button key={id} onClick={() => setScreen(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
            <div className={`w-11 h-7 rounded-2xl flex items-center justify-center transition-all duration-200`}
              style={active ? { background: PRIMARY_BG } : {}}>
              <Icon className="w-5 h-5" style={{ color: active ? PRIMARY : "#c4cdd8", transition: "color 0.2s" }} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: active ? PRIMARY : "#c4cdd8", transition: "color 0.2s" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── PrimaryBtn ────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full py-4 rounded-full font-bold text-white text-base disabled:opacity-60"
      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, boxShadow: `0 6px 24px rgba(77,200,240,0.38)` }}>
      {loading
        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        : children}
    </button>
  );
}

// ── RideStatusBadge ───────────────────────────────────────────
function RideStatusBadge({ status }) {
  const MAP = {
    pending:     { label: "Finding your rider...", bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b" },
    searching:   { label: "Searching nearby riders...", bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b" },
    assigned:    { label: "Rider is on the way! 🏍", bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY },
    otw:         { label: "Rider heading to you", bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY },
    arrived:     { label: "Rider has arrived! 🎉", bg: "#F0FDF4", color: "#15803d", dot: "#22c55e" },
    in_progress: { label: "You're on your way! 🚀", bg: "#EFF6FF", color: "#1d4ed8", dot: "#3b82f6" },
  };
  const cfg = MAP[status] || MAP.pending;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.dot }} />
      {cfg.label}
    </div>
  );
}

// ── StatusPill ────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    completed:   "bg-emerald-50 text-emerald-600",
    cancelled:   "bg-red-50 text-red-500",
    in_progress: "bg-blue-50 text-blue-600",
    pending:     "bg-amber-50 text-amber-600",
    searching:   "bg-amber-50 text-amber-600",
    assigned:    "bg-sky-50 text-sky-600",
    otw:         "bg-sky-50 text-sky-600",
    arrived:     "bg-emerald-50 text-emerald-600",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize flex-shrink-0 ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ── CancelModal ───────────────────────────────────────────────
function CancelModal({ onCancel, onKeep }) {
  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end z-30">
      <div className="w-full bg-white rounded-t-3xl px-5 pt-6 pb-10 space-y-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <div className="text-center">
          <div className="text-3xl mb-3">😔</div>
          <h3 className="font-bold text-gray-900 text-lg">Cancel this ride?</h3>
          <p className="text-sm text-gray-400 mt-1">Your rider may already be heading to you. Frequent cancellations may affect your account.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onKeep}
            className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl font-bold text-gray-700">
            Keep Ride
          </button>
          <button onClick={onCancel}
            className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl font-bold">
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}