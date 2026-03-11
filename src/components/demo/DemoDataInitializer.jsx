import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Auto-initializes demo data on first load for demo accounts.
 * Ensures persistent demo environment with realistic historical data.
 */
export default function DemoDataInitializer({ user }) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || initialized) return;
    
    const demoEmails = [
      "demo.customer@habal.app",
      "demo.rider@habal.app",
      "demo.operator@habal.app",
      "demo.dispatcher@habal.app",
      "demo.admin@habal.app",
    ];

    if (!demoEmails.includes(user.email)) return;

    const initDemoData = async () => {
      setLoading(true);
      try {
        // Check if demo data already exists
        const existingRider = await base44.entities.Rider.filter({ 
          email: "demo.rider@habal.app" 
        });
        
        if (existingRider.length === 0) {
          // Initialize demo data via backend function
          await base44.functions.invoke("initializeDemoData", { 
            forceInit: false 
          });
        }
        setInitialized(true);
      } catch (error) {
        console.error("Demo data initialization failed:", error);
      } finally {
        setLoading(false);
      }
    };

    initDemoData();
  }, [user, initialized]);

  // Silent component - no UI
  return null;
}