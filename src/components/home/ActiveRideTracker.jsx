import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Phone, X, ChevronRight, Bike } from "lucide-react";
import MapboxMap from "./MapboxMap";

const STATUS_LABELS = {
  pending:     { label: "Finding your rider...", color: "text-amber-500", bg: "bg-amber-50" },
  searching:   { label: "Searching for riders...", color: "text-amber-500", bg: "bg-amber-50" },
  assigned:    { label: "Rider assigned!", color: "text-emerald-600", bg: "bg-emerald-50" },
  otw:         { label: "Rider is on the way", color: "text-emerald-600", bg: "bg-emerald-50" },
  arrived:     { label: "Rider has arrived!", color: "text-emerald-700", bg: "bg-emerald-50" },
  in_progress: { label: "You're on the way!", color: "text-blue-600", bg: "bg-blue-50" },
  completed:   { label: "Ride completed!", color: "text-emerald-700", bg: "bg-emerald-50" },
  cancelled:   { label: "Ride cancelled", color: "text-red-500", bg: "bg-red-50" },
};

export default function ActiveRideTracker({ booking, pickupCoords, dropoffCoords, onDismiss }) {
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [currentBooking, setCurrentBooking] = useState(booking);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Poll booking status
  useEffect(() => {
    if (!booking?.id) return;
    const interval = setInterval(async () => {
      const updated = await base44.entities.Booking.filter({ booking_id: booking.booking_id }, "-created_date", 1);
      if (updated?.[0]) setCurrentBooking(updated[0]);
    }, 5000);
    return () => clearInterval(interval);
  }, [booking?.id]);

  // Poll rider location
  useEffect(() => {
    if (!currentBooking?.rider_id) return;
    const poll = async () => {
      const locs = await base44.entities.RiderLocation.filter({ rider_id: currentBooking.rider_id }, "-updated_date", 1);
      if (locs?.[0]) {
        setRiderLocation({ lat: locs[0].lat, lng: locs[0].lng });
        // Simple ETA: random 2-8 min when assigned/otw
        if (["assigned", "otw"].includes(currentBooking.status)) {
          setEta(Math.floor(Math.random() * 6) + 2);
        } else {
          setEta(null);
        }
      }
    };
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [currentBooking?.rider_id, currentBooking?.status]);

  const handleCancel = async () => {
    setCancelling(true);
    await base44.entities.Booking.update(currentBooking.id, {
      status: "cancelled",
      cancelled_by: "customer",
      cancellation_reason: "Cancelled by customer",
    });
    await base44.entities.BookingEvent.create({
      booking_id: currentBooking.id,
      event_type: "BOOKING_CANCELLED",
      actor_role: "customer",
      actor_name: "Customer",
      details: "Cancelled by customer",
      timestamp: new Date().toISOString(),
    });
    setCancelling(false);
    setShowCancel(false);
    onDismiss?.();
  };

  const statusInfo = STATUS_LABELS[currentBooking?.status] || STATUS_LABELS.pending;
  const isDone = ["completed", "cancelled"].includes(currentBooking?.status);
  const canCancel = ["pending", "searching", "assigned"].includes(currentBooking?.status);

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        <MapboxMap
          className="w-full h-full"
          pickupMarker={pickupCoords}
          dropoffMarker={dropoffCoords}
          riderMarker={riderLocation}
        />
      </div>

      {/* Bottom sheet */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-6 space-y-4" style={{ minHeight: "240px" }}>
        {/* Status pill */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {statusInfo.label}
        </div>

        {/* Booking details */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
            <span className="text-gray-700 truncate">{currentBooking?.pickup_address}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 truncate">{currentBooking?.dropoff_address}</span>
          </div>
        </div>

        {/* Rider info + ETA */}
        {currentBooking?.rider_name && (
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl">🏍</div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">{currentBooking.rider_name}</div>
                <div className="text-xs text-gray-400">{currentBooking.rider_phone}</div>
              </div>
            </div>
            {eta && (
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-600">{eta} min</div>
                <div className="text-xs text-gray-400">ETA</div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {canCancel && !isDone && (
            <button
              onClick={() => setShowCancel(true)}
              className="flex-1 py-3 border border-red-200 text-red-500 font-semibold rounded-xl text-sm hover:bg-red-50 transition-colors"
            >
              Cancel Ride
            </button>
          )}
          {isDone && (
            <button
              onClick={onDismiss}
              className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl text-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancel && (
        <div className="absolute inset-0 bg-black/50 flex items-end z-30">
          <div className="w-full bg-white rounded-t-3xl px-5 py-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Cancel this ride?</h3>
            <p className="text-sm text-gray-500">Your rider may already be on the way. Frequent cancellations may affect your account.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 text-sm">
                Keep Ride
              </button>
              <button onClick={handleCancel} disabled={cancelling} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm disabled:opacity-60">
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}