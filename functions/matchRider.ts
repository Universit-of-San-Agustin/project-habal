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
// Weights: proximity 50%, rating 30%, acceptance_rate 20%
function scoreRider(rider, riderLoc, bookingLoc) {
  const distKm = haversineKm(riderLoc.lat, riderLoc.lng, bookingLoc.lat, bookingLoc.lng);
  // Proximity: 0–1, best at 0km, drops off at 5km+
  const proximityScore = Math.max(0, 1 - distKm / 5);
  // Rating: normalize 0–5 → 0–1
  const ratingScore = (rider.avg_rating || 4) / 5;
  // Acceptance rate: 0–100 → 0–1
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

    // Service role for all DB ops — avoids auth errors
    const db = base44.asServiceRole;

    // 1. Fetch the booking
    const bookings = await db.entities.Booking.filter({ booking_id }, "-created_date", 1);
    const booking = bookings?.[0];
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.rider_id) return Response.json({ message: 'Booking already assigned', booking });

    // 2. Get all active + online riders in the same zone
    const riders = await db.entities.Rider.filter({
      status: "active",
      online_status: "online",
      ...(booking.zone ? { zone: booking.zone } : {}),
    }, "-avg_rating", 50);

    if (!riders?.length) {
      // No riders in zone — try any online active rider
      const allRiders = await db.entities.Rider.filter({ status: "active", online_status: "online" }, "-avg_rating", 50);
      if (!allRiders?.length) {
        return Response.json({ matched: false, reason: 'No available riders online' });
      }
      riders.push(...allRiders);
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

    // 4. Geocode the booking pickup address to get coordinates
    let bookingLat = null, bookingLng = null;
    try {
      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(booking.pickup_address)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=PH`
      );
      const geoData = await geoRes.json();
      if (geoData.features?.[0]?.center) {
        [bookingLng, bookingLat] = geoData.features[0].center;
      }
    } catch (_) {}

    // 5. Score and rank riders
    let bestRider = null;
    let bestScore = -1;

    for (const rider of riders) {
      // Skip riders already on a trip
      if (rider.online_status === "on_trip") continue;

      const loc = locMap[rider.id];
      let score;
      if (loc && bookingLat !== null) {
        score = scoreRider(rider, loc, { lat: bookingLat, lng: bookingLng });
      } else {
        // No GPS available — fall back to rating + acceptance only
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

    // 6. Assign booking to best rider
    const now = new Date().toISOString();
    const updated = await db.entities.Booking.update(booking.id, {
      status: "assigned",
      rider_id: bestRider.id,
      rider_name: bestRider.full_name,
      rider_phone: bestRider.phone || bestRider.email,
      assigned_at: now,
    });

    // 7. Update rider online status to on_trip
    await db.entities.Rider.update(bestRider.id, { online_status: "on_trip" });

    // 8. Log booking event
    await db.entities.BookingEvent.create({
      booking_id: booking.id,
      event_type: "RIDER_ASSIGNED",
      actor_role: "system",
      actor_name: "Auto-Match",
      details: `Matched rider ${bestRider.full_name} (score: ${bestScore.toFixed(2)})`,
      timestamp: now,
    });

    return Response.json({
      matched: true,
      rider: { id: bestRider.id, name: bestRider.full_name, score: bestScore },
      booking: updated,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});