import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SplashScreen from "../components/home/SplashScreen";
import LoginScreen from "../components/home/LoginScreen";
import CustomerHome from "../components/home/CustomerHome";
import RiderDashboard from "../components/home/RiderDashboard";

export default function Home() {
  const [phase, setPhase] = useState("splash"); // splash | login | app
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Show splash for 2.8s, then check auth
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

  const handleLogin = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      setPhase("app");
    } catch {
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  if (phase === "splash") return <SplashScreen />;
  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;
  // Route rider/dispatcher to rider dashboard
  if (user?.role === "rider" || user?.role === "dispatcher") return <RiderDashboard user={user} />;
  return <CustomerHome user={user} />;
}