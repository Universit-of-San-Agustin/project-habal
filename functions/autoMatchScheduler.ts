import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled auto-match: picks up unassigned pending/searching bookings and re-tries matching
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    // Fetch unassigned pending or searching bookings (cap at 10 to stay within time limits)
    const bookings = await db.entities.Booking.filter({ status: "pending" }, "-created_date", 10);
    const searchingBookings = await db.entities.Booking.filter({ status: "searching" }, "-created_date", 10);

    const allBookings = [...(bookings || []), ...(searchingBookings || [])]
      .filter(b => !b.rider_id) // skip already assigned
      .slice(0, 10); // hard cap to avoid timeout

    if (!allBookings.length) return Response.json({ processed: 0 });

    // Run all matchRider calls in parallel instead of sequentially
    const results = await Promise.allSettled(
      allBookings.map(booking =>
        db.functions.invoke("matchRider", { booking_id: booking.booking_id || booking.id })
          .then(res => ({ booking_id: booking.booking_id || booking.id, status: "ok", res }))
          .catch(err => ({ booking_id: booking.booking_id || booking.id, status: "error", error: err.message }))
      )
    );

    const summary = results.map(r => r.value || r.reason);
    return Response.json({ processed: allBookings.length, results: summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});