import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import SplashScreen from "../components/home/SplashScreen";
import LoginScreen from "../components/home/LoginScreen";
import CustomerHome from "../components/home/CustomerHome";
import RiderDashboard from "../components/home/RiderDashboard";

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
        // Not logged in — show login screen
        setPhase("login");
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (demoUser) => {
    // Demo role shortcut (pass a fake user object)
    if (demoUser?.id) {
      setUser(demoUser);
      setPhase("app");
      return;
    }
    // Real auth — redirect to platform login
    base44.auth.redirectToLogin(window.location.href);
  };

  if (phase === "splash") return <SplashScreen />;
  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;

  // Route by role
  const role = user?.role;

  if (role === "rider" || role === "dispatcher") {
    return <RiderDashboard user={user} />;
  }

  if (role === "admin" || role === "operator") {
    window.location.replace(createPageUrl("Dashboard"));
    return null;
  }

  // Default: customer app (role === "user" or any unrecognized role)
  return <CustomerHome user={user} />;
}