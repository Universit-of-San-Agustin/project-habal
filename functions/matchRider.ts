import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Score a rider (higher = better match)
function scoreRider(rider, riderLoc, bookingLoc) {
  const distKm = haversineKm(riderLoc.lat, riderLoc.lng, bookingLoc.lat, bookingLoc.lng);
  const proximityScore = Math.max(0, 1 - distKm / 5);
  const ratingScore = (rider.avg_rating || 4) / 5;
  const acceptanceScore = (rider.acceptance_rate || 80) / 100;
  return proximityScore * 0.5 + ratingScore * 0.3 + acceptanceScore * 0.2;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { booking_id } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'booking_id required' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // 1. Fetch the booking — support both booking_id string and DB id
    let bookingRows = await db.entities.Booking.filter({ booking_id }, "-created_date", 1);
    if (!bookingRows?.length) {
      bookingRows = await db.entities.Booking.filter({ id: booking_id }, "-created_date", 1);
    }
    const booking = bookingRows?.[0];
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    // Only process pending or searching bookings
    if (!["pending", "searching"].includes(booking.status)) {
      return Response.json({ message: 'Booking not in matchable state', status: booking.status });
    }

    // 2. Get all active + online riders in the same zone
    let riders = await db.entities.Rider.filter({
      status: "active",
      online_status: "online",
      ...(booking.zone ? { zone: booking.zone } : {}),
    }, "-avg_rating", 50);

    if (!riders?.length) {
      const allRiders = await db.entities.Rider.filter({ status: "active", online_status: "online" }, "-avg_rating", 50);
      if (!allRiders?.length) {
        // No riders available — keep booking as searching so it can be picked up later
        await db.entities.Booking.update(booking.id, { status: "searching" }).catch(() => {});
        return Response.json({ matched: false, reason: 'No available riders online' });
      }
      riders = allRiders;
    }

    // 3. Get GPS locations for all candidate riders
    const riderIds = riders.map(r => r.id);
    const allLocs = await db.entities.RiderLocation.list("-updated_date", 100);
    const locMap = {};
    for (const loc of (allLocs || [])) {
      if (riderIds.includes(loc.rider_id) && !locMap[loc.rider_id]) {
        locMap[loc.rider_id] = { lat: loc.lat, lng: loc.lng };
      }
    }

    // 4. Geocode booking pickup address
    let bookingLat = null, bookingLng = null;
    if (MAPBOX_TOKEN) {
      try {
        const geoRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(booking.pickup_address)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=PH`
        );
        const geoData = await geoRes.json();
        if (geoData.features?.[0]?.center) {
          [bookingLng, bookingLat] = geoData.features[0].center;
        }
      } catch (_) {}
    }

    // 5. Score and rank riders
    let bestRider = null;
    let bestScore = -1;

    for (const rider of riders) {
      if (rider.online_status === "on_trip") continue;
      const loc = locMap[rider.id];
      let score;
      if (loc && bookingLat !== null) {
        score = scoreRider(rider, loc, { lat: bookingLat, lng: bookingLng });
      } else {
        score = ((rider.avg_rating || 4) / 5) * 0.6 + ((rider.acceptance_rate || 80) / 100) * 0.4;
      }
      if (score > bestScore) {
        bestScore = score;
        bestRider = rider;
      }
    }

    if (!bestRider) {
      return Response.json({ matched: false, reason: 'No suitable rider found' });
    }

    // 6. Create a notification for the best rider — DO NOT assign yet.
    //    The rider must explicitly Accept from the popup.
    const now = new Date().toISOString();

    // Clear any old notifications for this booking for this rider
    const oldNotifs = await db.entities.Notification.filter({
      user_id: bestRider.id,
      reference_id: booking.id,
      type: "booking",
    }, "-created_date", 10).catch(() => []);
    for (const n of (oldNotifs || [])) {
      await db.entities.Notification.update(n.id, { read_status: true }).catch(() => {});
    }

    await db.entities.Notification.create({
      user_id: bestRider.id,
      user_type: "rider",
      title: "New Ride Request",
      message: `${booking.customer_name} needs a ride from ${booking.pickup_address}`,
      type: "booking",
      read_status: false,
      reference_id: booking.id,
      reference_type: "booking",
    });

    // Mark booking as searching (waiting for rider to accept)
    await db.entities.Booking.update(booking.id, { status: "searching" });

    await db.entities.BookingEvent.create({
      booking_id: booking.id,
      event_type: "RIDER_ASSIGNED",
      actor_role: "system",
      actor_name: "Auto-Match",
      details: `Dispatched to rider ${bestRider.full_name} (score: ${bestScore.toFixed(2)}) — awaiting acceptance`,
      timestamp: now,
    });

    return Response.json({
      matched: true,
      rider: { id: bestRider.id, name: bestRider.full_name, score: bestScore },
      status: 'notification_sent',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});