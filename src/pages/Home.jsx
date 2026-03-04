import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SplashScreen from "../components/home/SplashScreen";
import LoginScreen from "../components/home/LoginScreen";
import CustomerHome from "../components/home/CustomerHome";
import RiderDashboard from "../components/home/RiderDashboard";
import DispatcherDashboard from "../components/home/DispatcherDashboard";
import NetworkOwnerDashboard from "../components/home/NetworkOwnerDashboard";
import AdminDashboard from "../components/home/AdminDashboard";

export default function Home() {
  const [phase, setPhase] = useState("splash"); // splash | login | app
  const [user, setUser] = useState(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setPhase("app");
      } catch {
        setPhase("login");
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (demoUser) => {
    if (demoUser?.id) {
      setUser(demoUser);
      setPhase("app");
      return;
    }
    base44.auth.redirectToLogin(window.location.href);
  };

  if (phase === "splash") return <SplashScreen />;
  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;

  const role = user?.role;

  // Rider: go online/offline, accept assignments, update trip statuses
  if (role === "rider") return <RiderDashboard user={user} />;

  // Dispatcher: assign/reassign bookings, broadcast to riders, view logs
  if (role === "dispatcher") return <DispatcherDashboard user={user} />;

  // Network Owner (operator): full roster management, analytics, compliance
  if (role === "operator" || role === "network_owner") return <NetworkOwnerDashboard user={user} />;

  // Admin: approve networks, verify riders, enforce penalties, manage zones
  if (role === "admin") return <AdminDashboard user={user} />;

  // Default: Customer — book rides, track, history, wallet, ratings
  return <CustomerHome user={user} />;
}