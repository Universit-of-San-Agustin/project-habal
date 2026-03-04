import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Bike, Users, MapPin, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "../components/dashboard/StatCard";
import RecentBookings from "../components/dashboard/RecentBookings";
import NetworkHealthTable from "../components/dashboard/NetworkHealthTable";

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Booking.list("-created_date", 100),
      base44.entities.Network.list("-created_date", 50),
      base44.entities.Rider.list("-created_date", 200),
    ]).then(([b, n, r]) => {
      setBookings(b);
      setNetworks(n);
      setRiders(r);
      setLoading(false);
    });
  }, []);

  const activeBookings = bookings.filter(b => ["searching", "assigned", "otw", "arrived", "in_progress"].includes(b.status));
  const completedToday = bookings.filter(b => b.status === "completed" && new Date(b.created_date).toDateString() === new Date().toDateString());
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const onlineRiders = riders.filter(r => r.online_status === "online");
  const approvedNetworks = networks.filter(n => n.status === "approved");

  const zoneData = ["Jaro", "Mandurriao", "City Proper", "La Paz", "Arevalo"].map(zone => ({
    zone: zone.split(" ")[0],
    bookings: bookings.filter(b => b.zone === zone).length,
  }));

  const statusData = [
    { name: "Completed", value: bookings.filter(b => b.status === "completed").length, color: "#22c55e" },
    { name: "Active", value: activeBookings.length, color: "#f97316" },
    { name: "Cancelled", value: bookings.filter(b => b.status === "cancelled").length, color: "#ef4444" },
    { name: "Pending", value: pendingBookings.length, color: "#eab308" },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Iloilo Verified Rider Network — Live Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Rides" value={activeBookings.length} icon={Clock} color="orange" loading={loading} />
        <StatCard title="Completed Today" value={completedToday.length} icon={CheckCircle} color="green" loading={loading} />
        <StatCard title="Online Riders" value={onlineRiders.length} icon={Bike} color="blue" loading={loading} />
        <StatCard title="Active Networks" value={approvedNetworks.length} icon={Users} color="purple" loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Bookings by Zone</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="zone" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="bookings" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Booking Status</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-gray-400">{d.name}</span>
                    </div>
                    <span className="text-white font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-4">
        <RecentBookings bookings={bookings.slice(0, 8)} loading={loading} />
        <NetworkHealthTable networks={networks.slice(0, 6)} loading={loading} />
      </div>
    </div>
  );
}