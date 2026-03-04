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

  const handleLogin = async (demoUser) => {
    // If a demo user object is passed directly, use it
    if (demoUser?.id) {
      setUser(demoUser);
      setPhase("app");
      return;
    }
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

  // Route by role
  const role = user?.role;
  if (role === "rider" || role === "dispatcher") return <RiderDashboard user={user} />;
  if (role === "admin" || role === "operator") {
    // Redirect to admin dashboard
    window.location.href = "/Dashboard";
    return null;
  }
  return <CustomerHome user={user} />;
}