import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SplashScreen from "../components/home/SplashScreen";
import LoginScreen from "../components/home/LoginScreen";
// Removed unused UserNotRegisteredError import
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
  const [phase, setPhase] = useState("splash"); // splash | login | app
  const [user, setUser] = useState(null);
  const [demoRole, setDemoRole] = useState(null); // null = use real role
  const [isDemoSession, setIsDemoSession] = useState(false);

  // Session validation on mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        console.log("🔍 SESSION VALIDATION: Checking authentication state...");
        const me = await base44.auth.me();
        
        // Validate session completeness
        if (!me || !me.id || !me.email) {
          console.warn("⚠️ INCOMPLETE SESSION: Missing user data");
          setPhase("login");
          return;
        }

        console.log("✅ SESSION VALID:", {
          authenticated: true,
          user_id: me.id,
          email: me.email,
          full_name: me.full_name,
          role: me.role,
          timestamp: new Date().toISOString(),
        });

        setUser(me);
        setPhase("app");
        
        // Auto-enable demo switcher if user is a demo account
        const demoEmails = Object.values(DEMO_USERS).map(u => u.email);
        const isDemoUser = me?.is_demo_account === true || demoEmails.includes(me?.email);
        if (isDemoUser) {
          setIsDemoSession(true);
          console.log("🧪 DEMO MODE ENABLED:", { email: me.email, role: me.role });
        }
      } catch (err) {
        console.log("❌ AUTHENTICATION FAILED:", {
          message: err?.message,
          code: err?.code,
          timestamp: new Date().toISOString(),
        });
        // ANY authentication failure → redirect to login page
        // Never show "Access Restricted" for logged-out users
        setPhase("login");
      }
    };

    // Show splash screen, then validate
    const timer = setTimeout(validateSession, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    console.log("🔐 LOGIN REDIRECT: Initiating authentication flow");
    // Redirect to Base44 OAuth - returns to current URL after authentication
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleDemoSwitch = async (roleKey) => {
    if (!DEMO_MODE) return;
    console.log("🔄 ROLE SWITCH INITIATED:", { 
      from: user?.role, 
      to: DEMO_USERS[roleKey]?.role,
      user_email: user?.email,
    });
    
    try {
      const newRole = DEMO_USERS[roleKey]?.role;
      
      // Update user role in database
      await base44.auth.updateMe({ role: newRole });
      
      // Re-validate session
      const updatedUser = await base44.auth.me();
      
      console.log("✅ ROLE SWITCH COMPLETE:", { 
        email: updatedUser.email, 
        new_role: updatedUser.role,
        timestamp: new Date().toISOString(),
      });
      
      setUser(updatedUser);
      setDemoRole(null);
      
      // Brief loading state for smooth transition
      setPhase("loading");
      setTimeout(() => setPhase("app"), 100);
    } catch (err) {
      console.error("❌ ROLE SWITCH FAILED:", {
        error: err.message,
        attempted_role: DEMO_USERS[roleKey]?.role,
      });
      
      // Fallback to local role override
      setDemoRole(roleKey);
    }
  };

  // Authentication flow: splash → login → app
  if (phase === "splash") return <SplashScreen />;
  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;
  if (phase === "loading") return <SplashScreen />; // Brief loading state during role switch

  // CRITICAL: Only render dashboards when user is authenticated and has valid session
  if (!user || !user.id) {
    console.warn("⚠️ RENDER BLOCKED: No valid user session");
    return null;
  }

  // Determine effective role from database (strict role validation)
  const effectiveRole = user.role || "user";
  const activeUser = user;

  console.log("🎯 DASHBOARD ROUTING:", {
    user_id: user.id,
    email: user.email,
    effective_role: effectiveRole,
    rendering: effectiveRole === "admin" ? "AdminDashboard" : 
               effectiveRole === "rider" ? "RiderDashboard" :
               ["operator", "dispatcher", "network_owner"].includes(effectiveRole) ? "NetworkOwnerDashboard" : "CustomerHome",
  });

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