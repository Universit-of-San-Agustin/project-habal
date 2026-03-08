import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { booking_id } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'booking_id required' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // 1. Get the booking (support both booking_id string and internal id)
    let booking = null;
    const byBookingId = await db.entities.Booking.filter({ booking_id }, "-created_date", 1);
    booking = byBookingId?.[0];
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    // Only notify for pending/searching bookings
    if (!["pending", "searching"].includes(booking.status)) {
      return Response.json({ notified: 0, message: 'Booking not in notifiable state', status: booking.status });
    }

    // 2. Mark booking as searching
    await db.entities.Booking.update(booking.id, { status: "searching" }).catch(() => {});

    // 3. Find all online active riders in the same zone
    let riders = await db.entities.Rider.filter({
      status: "active",
      online_status: "online",
      zone: booking.zone || "City Proper",
    }, "-avg_rating", 100);

    // Also try without zone constraint if no riders found
    if (!riders || riders.length === 0) {
      riders = await db.entities.Rider.filter({
        status: "active",
        online_status: "online",
      }, "-avg_rating", 100);
    }

    if (!riders || riders.length === 0) {
      return Response.json({ notified: 0, message: 'No riders online' });
    }

    // 4. Clear old unread booking notifications for this booking to avoid duplicates
    const existingNotifs = await db.entities.Notification.filter({
      reference_id: booking.id,
      type: "booking",
      read_status: false,
    }, "-created_date", 200).catch(() => []);
    for (const n of (existingNotifs || [])) {
      await db.entities.Notification.update(n.id, { read_status: true }).catch(() => {});
    }

    // 5. Create fresh notification records for each eligible rider — in parallel
    const results = await Promise.allSettled(
      riders.map(rider =>
        db.entities.Notification.create({
          user_id: rider.id,
          user_type: "rider",
          title: "New Ride Request",
          message: `${booking.customer_name} needs a ride from ${booking.pickup_address}`,
          type: "booking",
          read_status: false,
          reference_id: booking.id,
          reference_type: "booking",
        }).then(() => ({ rider_id: rider.id, rider_name: rider.full_name }))
      )
    );
    const notifications = results
      .filter(r => r.status === "fulfilled")
      .map(r => r.value);

    return Response.json({
      notified: notifications.length,
      riders: notifications,
      booking_id,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});