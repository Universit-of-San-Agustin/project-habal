import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled auto-match: picks up unassigned pending bookings older than 30s and re-tries matching
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    // Fetch all pending unassigned bookings
    const bookings = await db.entities.Booking.filter({ status: "pending" }, "-created_date", 30);
    if (!bookings?.length) return Response.json({ processed: 0 });

    const results = [];
    for (const booking of bookings) {
      if (booking.rider_id) continue; // already assigned
      // Invoke matchRider for each
      const res = await db.functions.invoke("matchRider", { booking_id: booking.booking_id || booking.id });
      results.push({ booking_id: booking.booking_id, result: res });
    }

    return Response.json({ processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});