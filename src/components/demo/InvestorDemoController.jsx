import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Square, RotateCcw, Users, Navigation, TrendingUp } from "lucide-react";
import { COLORS } from "../shared/AppleDesignTokens";

const PRIMARY = COLORS.primary;

// Iloilo City zones with realistic coordinates
const ZONES = {
  Jaro: { center: [10.7202, 122.5621], radius: 0.015 },
  Mandurriao: { center: [10.7081, 122.5453], radius: 0.012 },
  "City Proper": { center: [10.6935, 122.5685], radius: 0.01 },
  "La Paz": { center: [10.7156, 122.5531], radius: 0.013 },
  Arevalo: { center: [10.6998, 122.5394], radius: 0.011 },
};

const RIDER_NAMES = [
  "Miguel Santos", "Juan dela Cruz", "Carlos Reyes", "Marco Gonzales", "Jose Ramos",
  "Pedro Aquino", "Ramon Cruz", "Luis Fernandez", "Antonio Lopez", "Diego Martinez",
  "Rafael Torres", "Manuel Garcia", "Roberto Flores", "Fernando Silva", "Andres Morales"
];

const CUSTOMER_NAMES = [
  "Maria Santos", "Ana Cruz", "Carmen Lopez", "Sofia Martinez", "Isabella Garcia",
  "Elena Reyes", "Rosa Flores", "Lucia Torres", "Gabriela Silva", "Valentina Morales"
];

export default function InvestorDemoController({ user }) {
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState({ riders: 0, bookings: 0, trips: 0 });
  const [loading, setLoading] = useState(false);
  
  const intervalRefs = useRef({
    riders: null,
    bookings: null,
    movement: null,
  });

  // Check if user has permission to access demo controls
  const hasPermission = ["admin", "operator", "network_owner"].includes(user?.role) || 
                        user?.email?.includes("demo.");

  useEffect(() => {
    if (isActive) {
      startDemoSimulation();
    } else {
      stopDemoSimulation();
    }
    return () => stopDemoSimulation();
  }, [isActive]);

  const startDemoSimulation = async () => {
    console.log("🎬 INVESTOR DEMO MODE: Starting simulation...");
    
    // Generate demo riders
    await generateDemoRiders();
    
    // Start continuous booking generation
    intervalRefs.current.bookings = setInterval(() => {
      generateDemoBooking();
    }, Math.random() * 40000 + 20000); // 20-60 seconds
    
    // Start rider movement updates
    intervalRefs.current.movement = setInterval(() => {
      updateRiderMovement();
    }, 2000); // Every 2 seconds
    
    console.log("✅ DEMO MODE: Simulation active");
  };

  const stopDemoSimulation = () => {
    Object.values(intervalRefs.current).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    intervalRefs.current = { riders: null, bookings: null, movement: null };
    console.log("⏹️ DEMO MODE: Simulation stopped");
  };

  const generateDemoRiders = async () => {
    try {
      const riderCount = Math.floor(Math.random() * 20) + 10; // 10-30 riders
      console.log(`🏍️ Generating ${riderCount} demo riders...`);
      
      const riders = [];
      for (let i = 0; i < riderCount; i++) {
        const zone = Object.keys(ZONES)[Math.floor(Math.random() * Object.keys(ZONES).length)];
        const location = getRandomLocationInZone(zone);
        
        riders.push({
          full_name: RIDER_NAMES[i % RIDER_NAMES.length] + ` #${i + 1}`,
          phone: `+639${Math.floor(Math.random() * 900000000 + 100000000)}`,
          zone,
          status: "active",
          online_status: "online",
          avg_rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          completed_trips: Math.floor(Math.random() * 500),
          acceptance_rate: (Math.random() * 30 + 70).toFixed(0),
          network_id: "demo-network",
          network_name: "Demo Network",
          role: "rider",
          is_demo_data: true,
        });
      }
      
      // Create riders in parallel
      await Promise.all(riders.map(rider => base44.entities.Rider.create(rider)));
      
      // Create initial location markers
      const createdRiders = await base44.entities.Rider.filter({ is_demo_data: true });
      await Promise.all(createdRiders.map(rider => {
        const zone = rider.zone || "Jaro";
        const location = getRandomLocationInZone(zone);
        return base44.entities.RiderLocation.create({
          rider_id: rider.id,
          rider_name: rider.full_name,
          lat: location.lat,
          lng: location.lng,
          heading: Math.random() * 360,
          speed: 0,
          status: "idle",
          is_demo_data: true,
        });
      }));
      
      setStats(s => ({ ...s, riders: createdRiders.length }));
      console.log(`✅ Created ${createdRiders.length} demo riders`);
    } catch (err) {
      console.error("❌ Demo rider generation failed:", err);
    }
  };

  const generateDemoBooking = async () => {
    try {
      const zones = Object.keys(ZONES);
      const pickupZone = zones[Math.floor(Math.random() * zones.length)];
      const dropoffZone = zones[Math.floor(Math.random() * zones.length)];
      
      const pickup = getRandomLocationInZone(pickupZone);
      const dropoff = getRandomLocationInZone(dropoffZone);
      
      const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      const fare = Math.round(distance * 15 + 40); // Base fare + per-km rate
      
      const booking = {
        customer_name: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
        customer_phone: `+639${Math.floor(Math.random() * 900000000 + 100000000)}`,
        pickup_address: `${pickupZone}, Iloilo City`,
        dropoff_address: `${dropoffZone}, Iloilo City`,
        zone: pickupZone,
        status: "pending",
        fare_estimate: fare,
        payment_method: Math.random() > 0.5 ? "cash" : "gcash",
        network_id: "demo-network",
        network_name: "Demo Network",
        is_demo_data: true,
      };
      
      await base44.entities.Booking.create(booking);
      setStats(s => ({ ...s, bookings: s.bookings + 1 }));
      
      console.log("📍 Demo booking created:", booking.pickup_address, "→", booking.dropoff_address);
      
      // Auto-assign rider after 3 seconds
      setTimeout(() => autoAssignRider(booking), 3000);
    } catch (err) {
      console.error("❌ Demo booking generation failed:", err);
    }
  };

  const autoAssignRider = async (bookingData) => {
    try {
      // Find pending booking
      const bookings = await base44.entities.Booking.filter({ 
        is_demo_data: true, 
        status: "pending" 
      });
      
      if (bookings.length === 0) return;
      
      const booking = bookings[0];
      
      // Get available demo riders
      const riders = await base44.entities.Rider.filter({ 
        is_demo_data: true, 
        online_status: "online",
        status: "active"
      });
      
      if (riders.length === 0) return;
      
      // Select random rider
      const rider = riders[Math.floor(Math.random() * riders.length)];
      
      // Assign booking
      await base44.entities.Booking.update(booking.id, {
        status: "assigned",
        rider_id: rider.id,
        rider_name: rider.full_name,
        rider_phone: rider.phone,
        assigned_at: new Date().toISOString(),
      });
      
      // Update rider status
      await base44.entities.Rider.update(rider.id, {
        online_status: "on_trip"
      });
      
      console.log("✅ Auto-assigned rider:", rider.full_name, "to booking", booking.id);
      
      // Simulate trip progression
      setTimeout(() => progressTrip(booking.id, "otw"), 5000);
      setTimeout(() => progressTrip(booking.id, "arrived"), 15000);
      setTimeout(() => progressTrip(booking.id, "in_progress"), 25000);
      setTimeout(() => completeTrip(booking.id, rider.id), 45000);
    } catch (err) {
      console.error("❌ Auto-assign failed:", err);
    }
  };

  const progressTrip = async (bookingId, status) => {
    try {
      const bookings = await base44.entities.Booking.filter({ id: bookingId });
      if (bookings.length === 0) return;
      
      await base44.entities.Booking.update(bookingId, { status });
      console.log(`🚀 Trip progressed to: ${status}`);
    } catch (err) {
      console.error("❌ Trip progression failed:", err);
    }
  };

  const completeTrip = async (bookingId, riderId) => {
    try {
      const bookings = await base44.entities.Booking.filter({ id: bookingId });
      if (bookings.length === 0) return;
      
      await base44.entities.Booking.update(bookingId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      
      // Return rider to online status
      await base44.entities.Rider.update(riderId, {
        online_status: "online",
        completed_trips: (await base44.entities.Rider.filter({ id: riderId }))[0].completed_trips + 1,
      });
      
      setStats(s => ({ ...s, trips: s.trips + 1 }));
      console.log("✅ Trip completed:", bookingId);
    } catch (err) {
      console.error("❌ Trip completion failed:", err);
    }
  };

  const updateRiderMovement = async () => {
    try {
      const locations = await base44.entities.RiderLocation.filter({ is_demo_data: true });
      
      // Update each rider location
      await Promise.all(locations.map(async (loc) => {
        const movement = 0.0005; // Small movement increment
        const newLat = loc.lat + (Math.random() - 0.5) * movement;
        const newLng = loc.lng + (Math.random() - 0.5) * movement;
        const newHeading = (loc.heading + (Math.random() - 0.5) * 30) % 360;
        
        return base44.entities.RiderLocation.update(loc.id, {
          lat: newLat,
          lng: newLng,
          heading: newHeading,
          speed: Math.random() * 20 + 10, // 10-30 km/h
        });
      }));
    } catch (err) {
      console.error("❌ Rider movement update failed:", err);
    }
  };

  const resetDemo = async () => {
    setLoading(true);
    try {
      console.log("🔄 Resetting demo environment...");
      
      // Delete all demo data
      const demoRiders = await base44.entities.Rider.filter({ is_demo_data: true });
      const demoBookings = await base44.entities.Booking.filter({ is_demo_data: true });
      const demoLocations = await base44.entities.RiderLocation.filter({ is_demo_data: true });
      
      await Promise.all([
        ...demoRiders.map(r => base44.entities.Rider.delete(r.id)),
        ...demoBookings.map(b => base44.entities.Booking.delete(b.id)),
        ...demoLocations.map(l => base44.entities.RiderLocation.delete(l.id)),
      ]);
      
      setStats({ riders: 0, bookings: 0, trips: 0 });
      setIsActive(false);
      
      console.log("✅ Demo environment reset complete");
    } catch (err) {
      console.error("❌ Demo reset failed:", err);
    }
    setLoading(false);
  };

  if (!hasPermission) return null;

  return (
    <div className="fixed top-4 right-4 z-[9998] max-w-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100" style={{ background: PRIMARY + "10" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: PRIMARY + "20" }}>
              <TrendingUp className="w-4 h-4" style={{ color: PRIMARY }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-900">Investor Demo Mode</div>
              <div className="text-[10px] text-gray-400">Live simulation controls</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 bg-gray-50 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-lg font-black" style={{ color: PRIMARY }}>{stats.riders}</div>
            <div className="text-[10px] text-gray-400">Riders</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-amber-600">{stats.bookings}</div>
            <div className="text-[10px] text-gray-400">Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-green-600">{stats.trips}</div>
            <div className="text-[10px] text-gray-400">Completed</div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => setIsActive(!isActive)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
            style={{ background: isActive ? "#ef4444" : PRIMARY, boxShadow: `0 4px 12px ${isActive ? "#ef444440" : PRIMARY + "40"}` }}>
            {isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isActive ? "Stop Simulation" : "Start Simulation"}
          </button>
          
          <button
            onClick={resetDemo}
            disabled={loading || isActive}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-gray-600 text-sm border-2 border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50">
            <RotateCcw className="w-4 h-4" />
            Reset Demo
          </button>
        </div>

        {/* Status */}
        {isActive && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-700">Simulation Active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getRandomLocationInZone(zoneName) {
  const zone = ZONES[zoneName] || ZONES.Jaro;
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * zone.radius;
  
  return {
    lat: zone.center[0] + radius * Math.cos(angle),
    lng: zone.center[1] + radius * Math.sin(angle),
  };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}