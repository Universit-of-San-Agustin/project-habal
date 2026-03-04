import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Star, ChevronRight, User, LogOut, Banknote, Bike, Navigation, RotateCcw } from "lucide-react";
import MapboxMap from "./MapboxMap";

const MAPBOX_TOKEN = "pk.eyJ1IjoieWlrMzQzMDAiLCJhIjoiY21seWd1ZnlpMHl6MTNnc2dkbjcwZ2NmZCJ9.RRkFfU-zgGip8mt8af3MWg";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/0385c3251_image.png";

async function reverseGeocode(lng, lat) {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address,poi`
    );
    const data = await res.json();
    if (data.features?.length) return data.features[0].place_name;
  } catch {}
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function forwardGeocode(query) {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=address,poi,place&country=PH&bbox=122.4,9.4,125.1,12.7`
    );
    const data = await res.json();
    return data.features?.map(f => ({ place_name: f.place_name, center: f.center })) || [];
  } catch {}
  return [];
}

export default function CustomerHome({ user }) {
  const [activeTab, setActiveTab] = useState("book");
  const [bookings, setBookings] = useState([]);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);

  // Booking state
  const [pickup, setPickup] = useState("Locating...");
  const [dropoff, setDropoff] = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (user) {
      base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 10).then(setBookings).catch(() => {});
    }
  }, [user]);

  const handleGeolocate = useCallback(async (lng, lat) => {
    setPickupCoords({ lng, lat });
    const addr = await reverseGeocode(lng, lat);
    setPickup(addr);
  }, []);

  const handleDropoffChange = useCallback((value) => {
    setDropoffInput(value);
    setDropoff(value);
    setDropoffCoords(null);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) {
        const results = await forwardGeocode(value);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 350);
  }, []);

  const selectSuggestion = useCallback((s) => {
    setDropoffInput(s.place_name);
    setDropoff(s.place_name);
    setDropoffCoords({ lng: s.center[0], lat: s.center[1] });
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleBook = async () => {
    if (!pickup || !dropoff || booking) return;
    setBooking(true);
    const bookingId = "BK-" + Date.now().toString(36).toUpperCase();
    const b = await base44.entities.Booking.create({
      booking_id: bookingId,
      customer_name: user?.full_name || "Guest",
      customer_phone: user?.email || "",
      pickup_address: pickup,
      dropoff_address: dropoff,
      zone: "Jaro",
      status: "pending",
      payment_method: paymentMethod.toLowerCase(),
    });
    await base44.entities.BookingEvent.create({
      booking_id: b.id,
      event_type: "BOOKING_CREATED",
      actor_role: "customer",
      actor_name: user?.full_name || "Guest",
      timestamp: new Date().toISOString(),
    });
    setBooked(b);
    setBooking(false);
    setDropoffInput("");
    setDropoff("");
    setDropoffCoords(null);
  };

  const TABS = [
    { id: "book", label: "Book", icon: MapPin },
    { id: "rides", label: "Rides", icon: Clock },
    { id: "wallet", label: "Wallet", icon: Banknote },
    { id: "ratings", label: "Ratings", icon: Star },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-white max-w-md mx-auto overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">Habal</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role || "Customer"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => base44.auth.logout()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2">
            <LogOut className="w-4 h-4" /> Exit
          </button>
        </div>
      </div>

      {/* BOOK TAB */}
      {activeTab === "book" && (
        <>
          {/* Map full screen behind overlay */}
          <div className="absolute inset-0 top-14">
            <MapboxMap
              className="w-full h-full"
              onGeolocate={handleGeolocate}
              pickupMarker={pickupCoords}
              dropoffMarker={dropoffCoords}
            />
          </div>

          {/* Top overlay: pickup + destination inputs */}
          <div className="absolute top-14 left-0 right-0 z-10 px-3 pt-3 space-y-2">
            {/* Pickup */}
            <div className="bg-white rounded-2xl shadow-md px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                <div className="w-4 h-4 rounded-full border-4 border-emerald-500 bg-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">Pick-up Location</div>
                <div className="text-sm text-gray-800 font-medium truncate">{pickup || "Set pickup location"}</div>
              </div>
              <button className="text-xs text-gray-400 border border-gray-200 rounded-lg px-2 py-1">Pin</button>
            </div>

            {/* Destination */}
            <div className="bg-white rounded-2xl shadow-md px-4 py-3 flex items-start gap-3 relative">
              <div className="mt-0.5">
                <MapPin className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-0.5">Destination</div>
                <input
                  value={dropoffInput}
                  onChange={e => handleDropoffChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search address or tap map"
                  className="w-full text-sm text-gray-700 bg-transparent border-none outline-none placeholder-gray-400"
                />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 mt-0.5" />

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{s.place_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booked success banner */}
          {booked && (
            <div className="absolute top-36 left-3 right-3 z-20 bg-emerald-500 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg">
              <div>
                <div className="font-semibold text-sm">Booking Submitted!</div>
                <div className="text-xs opacity-80">ID: {booked.booking_id}</div>
              </div>
              <button onClick={() => setBooked(null)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
            </div>
          )}

          {/* Bottom sheet */}
          <div className="absolute bottom-14 left-0 right-0 z-10 px-3 pb-3 space-y-2">
            {/* Payment + Time row */}
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod(p => p === "Cash" ? "GCash" : "Cash")}
                className="flex-1 flex items-center justify-center gap-2 bg-white rounded-xl shadow-md py-3 text-sm font-medium text-gray-700"
              >
                <Banknote className="w-4 h-4 text-gray-500" /> {paymentMethod}
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-white rounded-xl shadow-md py-3 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4 text-gray-500" /> Now
              </button>
            </div>

            {/* Ride type */}
            <div className="bg-white rounded-xl shadow-md py-3 px-4 flex items-center justify-center gap-2">
              <Bike className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-gray-800">Motorcycle</span>
            </div>

            {/* Order button */}
            <button
              onClick={handleBook}
              disabled={booking || !dropoff}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-between px-5 shadow-lg"
            >
              <span className="text-lg">—</span>
              <span className="text-base font-semibold">
                {booking ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : "Order"}
              </span>
            </button>
          </div>
        </>
      )}

      {/* RIDES TAB */}
      {activeTab === "rides" && (
        <div className="flex-1 overflow-y-auto px-4 pt-20 pb-20">
          <h2 className="text-lg font-bold text-gray-900 mb-4">My Rides</h2>
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-gray-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No rides yet</p>
            </div>
          ) : bookings.map(b => (
            <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-emerald-600 font-semibold">{b.booking_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${b.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-yellow-50 text-yellow-600"}`}>
                  {b.status}
                </span>
              </div>
              <div className="text-sm text-gray-800 font-medium truncate">{b.pickup_address}</div>
              <div className="text-xs text-gray-400 truncate mt-0.5">→ {b.dropoff_address}</div>
              {b.customer_rating && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500">{b.customer_rating}/5</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WALLET TAB */}
      {activeTab === "wallet" && (
        <div className="flex-1 overflow-y-auto px-4 pt-20 pb-20">
          <h2 className="text-lg font-bold text-gray-900 mb-4">My Wallet</h2>
          <div className="bg-emerald-500 rounded-2xl p-6 text-white mb-4 shadow-lg">
            <div className="text-sm opacity-80 mb-1">Available Balance</div>
            <div className="text-4xl font-bold">₱0.00</div>
            <div className="text-xs opacity-70 mt-2">Habal Wallet</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-400 shadow-sm">
            <Banknote className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No transactions yet</p>
          </div>
        </div>
      )}

      {/* RATINGS TAB */}
      {activeTab === "ratings" && (
        <div className="flex-1 overflow-y-auto px-4 pt-20 pb-20">
          <h2 className="text-lg font-bold text-gray-900 mb-4">My Ratings</h2>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center text-gray-400 shadow-sm">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No ratings yet</p>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${activeTab === id ? "text-emerald-500" : "text-gray-400"}`}
          >
            <Icon className={`w-5 h-5 ${activeTab === id ? "fill-emerald-500" : ""}`} style={activeTab === id && id === "book" ? { fill: "none" } : {}} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}