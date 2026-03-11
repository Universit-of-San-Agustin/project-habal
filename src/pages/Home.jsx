import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SplashScreen from "../components/home/SplashScreen";
import LoginScreen from "../components/home/LoginScreen";
import UserNotRegisteredError from "../components/UserNotRegisteredError";
import CustomerHome from "../components/home/CustomerHome";
import RiderDashboard from "../components/home/RiderDashboard";
import DispatcherDashboard from "../components/home/DispatcherDashboard";
import NetworkOwnerDashboard from "../components/home/NetworkOwnerDashboard";
import AdminDashboard from "../components/home/AdminDashboard";
import DemoRoleSwitcher from "../components/home/DemoRoleSwitcher";
import DemoDataInitializer from "../components/demo/DemoDataInitializer";

// Demo users for each role — mirrors the demo logins in LoginScreen
const DEMO_USERS = {
  customer: { id: "demo-customer", full_name: "Demo Customer", email: "demo.customer@habal.app", role: "user" },
  rider:    { id: "demo-rider",    full_name: "Demo Rider",    email: "demo.rider@habal.app",    role: "rider" },
  operator: { id: "demo-operator", full_name: "Demo Operator", email: "demo.operator@habal.app", role: "operator" },
  admin:      { id: "demo-admin",      full_name: "Demo Admin",      email: "demo.admin@habal.app",      role: "admin" },
  dispatcher: { id: "demo-dispatcher", full_name: "Demo Dispatcher", email: "demo.dispatcher@habal.app", role: "dispatcher" },
};

export default function Home() {
  const [phase, setPhase] = useState("splash"); // splash | login | app | not_registered
  const [user, setUser] = useState(null);
  const [demoRole, setDemoRole] = useState(null); // null = use real role
  const [isDemoSession, setIsDemoSession] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setPhase("app");
        // Auto-enable demo switcher for demo accounts
        const demoEmails = Object.values(DEMO_USERS).map(u => u.email);
        if (demoEmails.includes(me?.email)) setIsDemoSession(true);
      } catch (err) {
        const msg = err?.message || "";
        if (msg.includes("Authentication required to view users") || msg.includes("not registered")) {
          setPhase("not_registered");
        } else {
          setPhase("login");
        }
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (demoUser) => {
    if (demoUser) {
      setUser(demoUser);
      setPhase("app");
      setIsDemoSession(true); // All LoginScreen logins are demo
    } else {
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  const handleDemoSwitch = (roleKey) => {
    setDemoRole(roleKey);
    setUser(DEMO_USERS[roleKey]);
  };

  if (phase === "splash") return <SplashScreen />;
  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;
  if (phase === "not_registered") return <UserNotRegisteredError onDemoLogin={handleLogin} />;

  // Determine effective role
  const activeUser = demoRole ? DEMO_USERS[demoRole] : user;
  const role = activeUser?.role;

  // Current demo role key for the switcher highlight
  const currentDemoRoleKey = demoRole ||
    (user?.email === DEMO_USERS.rider.email       ? "rider"      :
     user?.email === DEMO_USERS.dispatcher?.email ? "dispatcher" :
     user?.email === DEMO_USERS.operator.email    ? "operator"   :
     user?.email === DEMO_USERS.admin.email       ? "admin"      : "customer");

  return (
    <>
      {/* Auto-initialize demo data for demo accounts */}
      <DemoDataInitializer user={activeUser} />

      {role === "rider"                              && <RiderDashboard user={activeUser} key={`rider-${activeUser?.id}`} />}
      {role === "dispatcher"                         && <DispatcherDashboard user={activeUser} key={`dispatcher-${activeUser?.id}`} />}
      {(role === "operator" || role === "network_owner") && <NetworkOwnerDashboard user={activeUser} key={`operator-${activeUser?.id}`} />}
      {role === "admin"                              && <AdminDashboard user={activeUser} key={`admin-${activeUser?.id}`} />}
      {role !== "rider" && role !== "dispatcher" && role !== "operator" && role !== "network_owner" && role !== "admin"
        && <CustomerHome user={activeUser} key={`customer-${activeUser?.id}`} />}

      {isDemoSession && (
        <DemoRoleSwitcher
          currentRole={currentDemoRoleKey}
          onSwitch={handleDemoSwitch}
        />
      )}
    </>
  );
}