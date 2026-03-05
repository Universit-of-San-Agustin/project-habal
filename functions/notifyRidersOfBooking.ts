import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { booking_id } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'booking_id required' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // 1. Get the booking
    const bookings = await db.entities.Booking.filter({ booking_id }, "-created_date", 1);
    const booking = bookings?.[0];
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    // 2. Find all online riders in the same zone
    const riders = await db.entities.Rider.filter({
      status: "active",
      online_status: "online",
      zone: booking.zone || "City Proper",
    }, "-avg_rating", 100);

    if (!riders || riders.length === 0) {
      return Response.json({ notified: 0, message: 'No riders online in this zone' });
    }

    // 3. Create notification records for each rider
    // In production, you'd use real-time messaging (WebSocket, Firebase, Pusher, etc.)
    // For now, we log the notification so riders can poll for it
    const notifications = [];
    for (const rider of riders) {
      try {
        await db.entities.Notification.create({
          user_id: rider.id,
          user_type: "rider",
          title: "New Ride Request",
          message: `${booking.customer_name} is requesting a ride from ${booking.pickup_address}. Accept to get ₱${booking.fare_estimate}!`,
          type: "booking",
          read_status: false,
          reference_id: booking.id,
          reference_type: "booking",
        });
        notifications.push({ rider_id: rider.id, rider_name: rider.full_name });
      } catch (e) {
        console.error(`Failed to notify rider ${rider.id}:`, e.message);
      }
    }

    return Response.json({
      notified: notifications.length,
      riders: notifications,
      booking_id,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});