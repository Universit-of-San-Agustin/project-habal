import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Star, User, LogOut, CheckCircle, XCircle, Bike, ChevronRight, Upload } from "lucide-react";
import MapboxMap from "./MapboxMap";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/0385c3251_image.png";

export default function RiderDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("home");
  const [riderData, setRiderData] = useState(null);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [riderCoords, setRiderCoords] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Load rider profile
    base44.entities.Rider.filter({ email: user?.email }, "-created_date", 1)
      .then(rows => setRiderData(rows?.[0] || null))
      .catch(() => {});
    loadBookings();
  }, [user]);

  // Broadcast GPS location every 10s if on an active booking
  useEffect(() => {
    if (!riderData?.id) return;
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => {
        const { longitude: lng, latitude: lat } = pos.coords;
        setRiderCoords({ lat, lng });
        base44.entities.RiderLocation.filter({ rider_id: riderData.id }, "-updated_date", 1).then(locs => {
          if (locs?.[0]) {
            base44.entities.RiderLocation.update(locs[0].id, { lat, lng, rider_name: user?.full_name });
          } else {
            base44.entities.RiderLocation.create({ rider_id: riderData.id, rider_name: user?.full_name, lat, lng });
          }
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation?.clearWatch(watchId);
  }, [riderData?.id]);

  const loadBookings = async () => {
    // Pending bookings in rider's zone (all assigned to no rider or assigned to this rider)
    const all = await base44.entities.Booking.filter({ status: "pending" }, "-created_date", 20);
    setPendingBookings(all);

    // Active booking for this rider
    if (riderData?.id) {
      const active = await base44.entities.Booking.filter({ rider_id: riderData.id }, "-created_date", 1);
      const current = active?.find(b => ["assigned", "otw", "arrived", "in_progress"].includes(b.status));
      setActiveBooking(current || null);
    }
  };

  const handleAccept = async (booking) => {
    setProcessing(true);
    await base44.entities.Booking.update(booking.id, {
      status: "assigned",
      rider_id: riderData?.id || user?.id,
      rider_name: user?.full_name,
      rider_phone: user?.email,
      assigned_at: new Date().toISOString(),
    });
    await base44.entities.BookingEvent.create({
      booking_id: booking.id,
      event_type: "RIDER_ASSIGNED",
      actor_role: "rider",
      actor_name: user?.full_name,
      timestamp: new Date().toISOString(),
    });
    setActiveBooking({ ...booking, status: "assigned", rider_name: user?.full_name });
    setPendingBookings(p => p.filter(b => b.id !== booking.id));
    setProcessing(false);
    setActiveTab("home");
  };

  const handleDecline = async (booking) => {
    setPendingBookings(p => p.filter(b => b.id !== booking.id));
  };

  const handleStatusUpdate = async (status) => {
    if (!activeBooking) return;
    setProcessing(true);
    const eventMap = {
      otw: "RIDER_ACCEPTED",
      arrived: "RIDER_ARRIVED",
      in_progress: "TRIP_STARTED",
      completed: "TRIP_ENDED",
    };
    await base44.entities.Booking.update(activeBooking.id, {
      status,
      ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      ...(status === "in_progress" ? { started_at: new Date().toISOString() } : {}),
    });
    await base44.entities.BookingEvent.create({
      booking_id: activeBooking.id,
      event_type: eventMap[status] || "BOOKING_REASSIGNED",
      actor_role: "rider",
      actor_name: user?.full_name,
      timestamp: new Date().toISOString(),
    });
    if (status === "completed") {
      setActiveBooking(null);
    } else {
      setActiveBooking(b => ({ ...b, status }));
    }
    setProcessing(false);
  };

  const handleCancelRide = async () => {
    if (!activeBooking) return;
    setProcessing(true);
    await base44.entities.Booking.update(activeBooking.id, {
      status: "cancelled",
      cancelled_by: "rider",
      cancellation_reason: "Cancelled by rider",
    });
    await base44.entities.BookingEvent.create({
      booking_id: activeBooking.id,
      event_type: "BOOKING_CANCELLED",
      actor_role: "rider",
      actor_name: user?.full_name,
      details: "Cancelled by rider",
      timestamp: new Date().toISOString(),
    });
    setActiveBooking(null);
    setProcessing(false);
  };

  const TABS = [
    { id: "home", label: "Home", icon: Bike },
    { id: "requests", label: "Requests", icon: Clock, badge: pendingBookings.length },
    { id: "history", label: "History", icon: CheckCircle },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-white max-w-md mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 z-20">
        <div className="flex items-center gap-2">
          <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-bold text-gray-900 text-sm">{user?.full_name?.split(" ")[0]}</div>
            <div className="text-xs text-emerald-500 font-medium">● Online</div>
          </div>
        </div>
        <button onClick={() => base44.auth.logout()} className="flex items-center gap-1 text-sm text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100">
          <LogOut className="w-4 h-4" /> Exit
        </button>
      </div>

      {/* HOME: Map + active booking */}
      {activeTab === "home" && (
        <div className="flex-1 relative">
          <MapboxMap
            className="w-full h-full"
            onGeolocate={(lng, lat) => setRiderCoords({ lat, lng })}
          />
          {activeBooking && (
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  activeBooking.status === "assigned" ? "bg-amber-50 text-amber-600" :
                  activeBooking.status === "otw" ? "bg-blue-50 text-blue-600" :
                  activeBooking.status === "arrived" ? "bg-emerald-50 text-emerald-600" :
                  "bg-purple-50 text-purple-600"
                }`}>
                  {activeBooking.status === "assigned" && "Assigned — Head to pickup"}
                  {activeBooking.status === "otw" && "On the way to customer"}
                  {activeBooking.status === "arrived" && "Arrived at pickup"}
                  {activeBooking.status === "in_progress" && "Trip in progress"}
                </div>
              </div>
              <div className="text-sm text-gray-700 font-medium">{activeBooking.customer_name}</div>
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                {activeBooking.pickup_address}
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <MapPin className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                {activeBooking.dropoff_address}
              </div>
              <div className="flex gap-2">
                {activeBooking.status === "assigned" && (
                  <button onClick={() => handleStatusUpdate("otw")} disabled={processing} className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60">
                    I'm On My Way
                  </button>
                )}
                {activeBooking.status === "otw" && (
                  <button onClick={() => handleStatusUpdate("arrived")} disabled={processing} className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60">
                    I've Arrived
                  </button>
                )}
                {activeBooking.status === "arrived" && (
                  <button onClick={() => handleStatusUpdate("in_progress")} disabled={processing} className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60">
                    Start Trip
                  </button>
                )}
                {activeBooking.status === "in_progress" && (
                  <button onClick={() => handleStatusUpdate("completed")} disabled={processing} className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl text-sm disabled:opacity-60">
                    Complete Trip
                  </button>
                )}
                {["assigned", "otw"].includes(activeBooking.status) && (
                  <button onClick={handleCancelRide} disabled={processing} className="py-3 px-4 border border-red-200 text-red-500 font-semibold rounded-xl text-sm disabled:opacity-60">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
          {!activeBooking && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm rounded-t-2xl px-5 py-4 border-t border-gray-100">
              <p className="text-sm text-center text-gray-500">No active ride — waiting for requests</p>
            </div>
          )}
        </div>
      )}

      {/* REQUESTS tab */}
      {activeTab === "requests" && (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
          <h2 className="font-bold text-gray-900 text-lg mb-4">Ride Requests</h2>
          {pendingBookings.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No pending requests</p>
            </div>
          ) : pendingBookings.map(b => (
            <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-emerald-600 font-semibold">{b.booking_id}</span>
                <span className="text-xs text-gray-400">{b.zone}</span>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">{b.customer_name}</div>
              <div className="text-xs text-gray-500 mb-0.5 truncate">📍 {b.pickup_address}</div>
              <div className="text-xs text-gray-500 mb-3 truncate">🏁 {b.dropoff_address}</div>
              <div className="flex gap-2">
                <button onClick={() => handleAccept(b)} disabled={processing} className="flex-1 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-60">
                  <CheckCircle className="w-4 h-4" /> Accept
                </button>
                <button onClick={() => handleDecline(b)} className="flex-1 py-2.5 border border-red-200 text-red-500 font-semibold rounded-xl text-sm flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4" /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY tab */}
      {activeTab === "history" && <RiderHistory riderId={riderData?.id} riderEmail={user?.email} />}

      {/* PROFILE tab */}
      {activeTab === "profile" && <RiderProfile user={user} riderData={riderData} setRiderData={setRiderData} />}

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 flex">
        {TABS.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 relative transition-colors ${activeTab === id ? "text-emerald-500" : "text-gray-400"}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
            {badge > 0 && (
              <span className="absolute top-2 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function RiderHistory({ riderId, riderEmail }) {
  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    if (!riderEmail) return;
    base44.entities.Booking.filter({ rider_phone: riderEmail }, "-created_date", 20).then(setBookings).catch(() => {});
  }, [riderEmail]);
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
      <h2 className="font-bold text-gray-900 text-lg mb-4">Trip History</h2>
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <CheckCircle className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No trips yet</p>
        </div>
      ) : bookings.map(b => (
        <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs text-emerald-600">{b.booking_id}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${b.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
              {b.status}
            </span>
          </div>
          <div className="text-sm text-gray-700 truncate">{b.pickup_address}</div>
          <div className="text-xs text-gray-400 truncate">→ {b.dropoff_address}</div>
          {b.customer_rating && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-gray-500">{b.customer_rating}/5</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RiderProfile({ user, riderData, setRiderData }) {
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
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
      <h2 className="font-bold text-gray-900 text-lg mb-6">My Profile</h2>

      {/* Avatar + Stats */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-3 text-4xl">🏍</div>
        <div className="font-bold text-gray-900 text-lg">{user?.full_name}</div>
        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
          <Star className="w-4 h-4 text-yellow-400 fill-current" />
          <span>{riderData?.avg_rating?.toFixed(1) || "—"}</span>
          <span className="mx-1 text-gray-300">·</span>
          <span>{riderData?.completed_trips || 0} trips</span>
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="space-y-3 mb-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle Details</div>
        {[
          { label: "Motorcycle Make", key: "motorcycle_make", placeholder: "e.g. Honda" },
          { label: "Motorcycle Model", key: "motorcycle_model", placeholder: "e.g. XRM125" },
          { label: "Plate Number", key: "plate_number", placeholder: "e.g. ABC 1234" },
          { label: "Phone", key: "phone", placeholder: "+63 900 000 0000" },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <input
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-emerald-400"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !riderData?.id}
        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm disabled:opacity-60 transition-colors"
      >
        {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
      </button>

      <button
        onClick={() => base44.auth.logout()}
        className="w-full mt-3 py-3 border border-gray-200 text-gray-500 font-medium rounded-xl text-sm flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}