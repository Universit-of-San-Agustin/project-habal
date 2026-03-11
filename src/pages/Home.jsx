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
import DemoModeIndicator from "../components/demo/DemoModeIndicator";

/**
 * ═══════════════════════════════════════════════════════════════
 * HABAL Platform - Production Entry Point
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🔧 PRODUCTION CONFIGURATION
 * 
 * DEMO_MODE: Controls demo testing features
 * ├─ TRUE:  Dashboard demo switcher enabled (for testing/demos)
 * └─ FALSE: Production mode - all demo UI hidden
 * 
 * ⚠️ IMPORTANT FOR DEPLOYMENT:
 * Set DEMO_MODE = false before production launch.
 * 
 * ═══════════════════════════════════════════════════════════════
 * 
 * 📊 PRODUCTION-INTEGRATED DEMO SYSTEM:
 * 
 * ✅ ALL DATA IS REAL - Demo accounts use the same production database
 * ✅ NO SIMULATION - All bookings, trips, and events are real records
 * ✅ CROSS-USER INTERACTION - Demo riders can accept real customer bookings
 * ✅ REAL-TIME SYNC - GPS tracking, dispatch, and chat work normally
 * ✅ TRUE WORKFLOWS - Every action follows production business logic
 * 
 * DEMO ROLE SWITCHER:
 * - Allows instant role perspective changes for testing/presentations
 * - Maintains real database session (no data reset on role switch)
 * - Users can experience Customer → Rider → Operator → Admin flows
 * - Perfect for investor demos and QA testing
 * 
 * EXAMPLE WORKFLOW:
 * 1. Login as demo.customer@habal.app
 * 2. Create a real booking (stored in Booking entity)
 * 3. Switch to Rider role via demo switcher
 * 4. Accept the booking (real dispatch system)
 * 5. Switch to Operator role
 * 6. Monitor the trip in real-time (live GPS tracking)
 * 7. Switch to Admin role
 * 8. View audit logs of all actions
 * 
 * 🎭 DEMO ACCOUNTS:
 * - demo.customer@habal.app   → Customer booking flow
 * - demo.rider@habal.app      → Rider trip management  
 * - demo.operator@habal.app   → Network dispatch operations
 * - demo.dispatcher@habal.app → Booking queue management
 * - demo.admin@habal.app      → Platform administration
 * 
 * Demo switcher (floating button + top indicator) only appears when:
 * 1. DEMO_MODE = true
 * 2. User is logged in as a demo account
 * 
 * ═══════════════════════════════════════════════════════════════
 */
const DEMO_MODE = true;

// Demo users for testing — only active when DEMO_MODE = true
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
        // Auto-enable demo switcher ONLY if DEMO_MODE is enabled AND user is a demo account
        if (DEMO_MODE) {
          const demoEmails = Object.values(DEMO_USERS).map(u => u.email);
          if (demoEmails.includes(me?.email)) setIsDemoSession(true);
        }
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

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleDemoSwitch = (roleKey) => {
    if (!DEMO_MODE) return;
    // Switch role context while maintaining the real user session
    // This allows testing different role perspectives with the same database
    setDemoRole(roleKey);
  };

  if (phase === "splash") return <SplashScreen />;
  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;
  if (phase === "not_registered") return <UserNotRegisteredError onDemoLogin={handleLogin} />;

  // Determine effective role: if demo role is set, use that; otherwise use real user role
  const effectiveRole = demoRole ? DEMO_USERS[demoRole]?.role : user?.role;
  const activeUser = demoRole ? { ...user, ...DEMO_USERS[demoRole] } : user;

  // Current demo role key for the switcher highlight
  const currentDemoRoleKey = demoRole ||
    (user?.email === DEMO_USERS.rider.email       ? "rider"      :
     user?.email === DEMO_USERS.dispatcher?.email ? "dispatcher" :
     user?.email === DEMO_USERS.operator.email    ? "operator"   :
     user?.email === DEMO_USERS.admin.email       ? "admin"      : "customer");

  return (
    <>
      {/* Auto-initialize demo data ONLY for demo accounts on first login */}
      {DEMO_MODE && <DemoDataInitializer user={activeUser} />}

      {effectiveRole === "rider"                              && <RiderDashboard user={activeUser} key={`rider-${demoRole || activeUser?.id}`} />}
      {effectiveRole === "dispatcher"                         && <DispatcherDashboard user={activeUser} key={`dispatcher-${demoRole || activeUser?.id}`} />}
      {(effectiveRole === "operator" || effectiveRole === "network_owner") && <NetworkOwnerDashboard user={activeUser} key={`operator-${demoRole || activeUser?.id}`} />}
      {effectiveRole === "admin"                              && <AdminDashboard user={activeUser} key={`admin-${demoRole || activeUser?.id}`} />}
      {effectiveRole !== "rider" && effectiveRole !== "dispatcher" && effectiveRole !== "operator" && effectiveRole !== "network_owner" && effectiveRole !== "admin"
        && <CustomerHome user={activeUser} key={`customer-${demoRole || activeUser?.id}`} />}

      {/* Demo Mode UI - only shown when DEMO_MODE=true AND logged in as demo account */}
      {DEMO_MODE && isDemoSession && (
        <>
          <DemoModeIndicator currentRole={currentDemoRoleKey} />
          <DemoRoleSwitcher
            currentRole={currentDemoRoleKey}
            onSwitch={handleDemoSwitch}
          />
        </>
      )}
    </>
  );
}