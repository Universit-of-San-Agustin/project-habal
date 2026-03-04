import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Bike, Clock, Star, ChevronRight, Search, User, LogOut } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const ZONES = ["Jaro", "Mandurriao", "City Proper", "La Paz", "Arevalo"];

export default function CustomerHome({ user }) {
  const [bookings, setBookings] = useState([]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [zone, setZone] = useState("Jaro");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    if (user) {
      base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 5).then(setBookings).catch(() => {});
    }
  }, [user]);

  const handleBook = async () => {
    if (!pickup || !dropoff) return;
    setBooking(true);
    const bookingId = "BK-" + Date.now().toString(36).toUpperCase();
    const b = await base44.entities.Booking.create({
      booking_id: bookingId,
      customer_name: user?.full_name || "Guest",
      customer_phone: user?.email || "",
      pickup_address: pickup,
      dropoff_address: dropoff,
      zone,
      status: "pending",
      payment_method: "cash",
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
    setPickup("");
    setDropoff("");
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto"
      style={{ background: "linear-gradient(180deg, #0f0f0f 0%, #111111 100%)" }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Good ride,</p>
            <h1 className="text-xl font-bold text-white">{user?.full_name?.split(" ")[0] || "Rider"} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-orange-400" />
            </div>
            <button onClick={() => base44.auth.logout()} className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Booking card */}
      {activeTab === "home" && (
        <div className="flex-1 px-5 space-y-4 overflow-y-auto pb-24">

          {booked && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 font-semibold text-sm">Booking Submitted!</span>
              </div>
              <p className="text-gray-300 text-xs">ID: <span className="font-mono text-orange-400">{booked.booking_id}</span></p>
              <p className="text-gray-400 text-xs mt-1">A verified rider will be assigned shortly.</p>
              <button onClick={() => setBooked(null)} className="mt-2 text-xs text-gray-500 underline">Dismiss</button>
            </div>
          )}

          {/* Book a ride */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <Bike className="w-5 h-5 text-orange-400" /> Book a Ride
            </h2>

            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                </div>
                <input
                  value={pickup}
                  onChange={e => setPickup(e.target.value)}
                  placeholder="Pickup location"
                  className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <input
                  value={dropoff}
                  onChange={e => setDropoff(e.target.value)}
                  placeholder="Where to?"
                  className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <select
                value={zone}
                onChange={e => setZone(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl text-sm focus:outline-none focus:border-orange-500"
              >
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>

            {/* Fare estimate */}
            <div className="mt-4 flex items-center justify-between text-sm bg-gray-800 rounded-xl px-4 py-3">
              <span className="text-gray-400">Estimated Fare</span>
              <span className="text-orange-400 font-bold">₱40 – ₱120</span>
            </div>

            <button
              onClick={handleBook}
              disabled={booking || !pickup || !dropoff}
              className="mt-4 w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ boxShadow: "0 4px 20px rgba(249,115,22,0.35)" }}
            >
              {booking ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Book Now <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          {/* Zone cards */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Available Zones</h3>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {ZONES.map((z, i) => (
                <div key={z}
                  onClick={() => setZone(z)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl border cursor-pointer transition-all ${zone === z ? "bg-orange-500/20 border-orange-500/40 text-orange-400" : "bg-gray-900 border-gray-700 text-gray-400"}`}>
                  <div className="text-xs font-semibold whitespace-nowrap">{z}</div>
                  <div className="text-xs opacity-60 mt-0.5">Active</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats banner */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Verified Riders", value: "30+", icon: Shield },
              { label: "Avg Rating", value: "4.8★", icon: Star },
              { label: "Zones", value: "5", icon: MapPin },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "trips" && (
        <div className="flex-1 px-5 pb-24 overflow-y-auto">
          <h2 className="text-white font-bold text-base mb-4 mt-2">My Trips</h2>
          {bookings.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No trips yet</p>
            </div>
          ) : bookings.map(b => (
            <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-orange-400">{b.booking_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${b.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                  {b.status}
                </span>
              </div>
              <div className="text-sm text-white truncate">{b.pickup_address}</div>
              <div className="text-xs text-gray-400 truncate">→ {b.dropoff_address}</div>
              {b.customer_rating && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-300">{b.customer_rating}/5</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-6 pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex overflow-hidden">
          {[
            { id: "home", label: "Home", icon: Bike },
            { id: "trips", label: "My Trips", icon: Clock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${activeTab === id ? "text-orange-400" : "text-gray-500"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Shield(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}