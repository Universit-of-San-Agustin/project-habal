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
// Note: dispatcher and operator roles are merged into "operator"
const DEMO_USERS = {
  customer: { id: "demo-customer", full_name: "Demo Customer", email: "demo.customer@habal.app", role: "user" },
  rider:    { id: "demo-rider",    full_name: "Demo Rider",    email: "demo.rider@habal.app",    role: "rider" },
  operator: { id: "demo-operator", full_name: "Demo Operator", email: "demo.operator@habal.app", role: "operator" },
  admin:    { id: "demo-admin",    full_name: "Demo Admin",    email: "demo.admin@habal.app",    role: "admin" },
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
        console.log("🔐 AUTH STATE:", {
          authenticated: !!me,
          user_id: me?.id,
          email: me?.email,
          full_name: me?.full_name,
          role: me?.role,
          is_demo_account: Object.values(DEMO_USERS).map(u => u.email).includes(me?.email),
        });
        setUser(me);
        setPhase("app");
        // Auto-enable demo switcher if user is a demo account (via is_demo_account flag OR demo email)
        const demoEmails = Object.values(DEMO_USERS).map(u => u.email);
        const isDemoUser = me?.is_demo_account === true || demoEmails.includes(me?.email);
        if (isDemoUser) {
          setIsDemoSession(true);
          console.log("🧪 DEMO MODE ENABLED:", { email: me?.email, role: me?.role });
        }
      } catch (err) {
        console.log("❌ AUTH ERROR:", {
          message: err?.message,
          error: err,
        });
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

  const handleDemoSwitch = async (roleKey) => {
    if (!DEMO_MODE) return;
    console.log("🔄 SWITCHING ROLE:", { from: user?.role, to: DEMO_USERS[roleKey]?.role });
    // Update the user's role in the database for persistent demo switching
    try {
      const newRole = DEMO_USERS[roleKey]?.role;
      await base44.auth.updateMe({ role: newRole });
      const updatedUser = await base44.auth.me();
      console.log("✅ ROLE SWITCHED:", { email: updatedUser?.email, role: updatedUser?.role });
      setUser(updatedUser);
      setDemoRole(null); // Clear demo role override since real user now has the role
      // Force re-render
      setPhase("loading");
      setTimeout(() => setPhase("app"), 100);
    } catch (err) {
      console.error("❌ ROLE SWITCH FAILED:", err);
      // Fallback to local role switching if DB update fails
      setDemoRole(roleKey);
    }
  };

  // Authentication flow: splash → login/not_registered → app
  if (phase === "splash") return <SplashScreen />;
  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;
  if (phase === "not_registered") return <UserNotRegisteredError onDemoLogin={handleLogin} />;
  if (phase === "loading") return <SplashScreen />; // Brief loading state during role switch

  // Determine effective role from actual user data (DB role takes precedence)
  const effectiveRole = user?.role || "user";
  const activeUser = user;

  // Map database role to demo switcher key
  const roleToKeyMap = {
    "user": "customer",
    "rider": "rider",
    "operator": "operator",
    "dispatcher": "operator", // legacy dispatcher role maps to operator
    "network_owner": "operator", // legacy network_owner maps to operator
    "admin": "admin",
  };
  const currentDemoRoleKey = roleToKeyMap[user?.role] || "customer";

  return (
    <>
      {/* Auto-initialize demo data ONLY for demo accounts on first login */}
      {DEMO_MODE && <DemoDataInitializer user={activeUser} />}

      {/* Role-based dashboard routing with strict role enforcement */}
      {effectiveRole === "rider" && <RiderDashboard user={activeUser} key={`rider-${activeUser?.id}`} />}
      {(effectiveRole === "dispatcher" || effectiveRole === "operator" || effectiveRole === "network_owner") && (
        <NetworkOwnerDashboard user={activeUser} key={`operator-${activeUser?.id}`} />
      )}
      {effectiveRole === "admin" && <AdminDashboard user={activeUser} key={`admin-${activeUser?.id}`} />}
      {(effectiveRole === "user" || !["rider", "dispatcher", "operator", "network_owner", "admin"].includes(effectiveRole)) && (
        <CustomerHome user={activeUser} key={`customer-${activeUser?.id}`} />
      )}

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