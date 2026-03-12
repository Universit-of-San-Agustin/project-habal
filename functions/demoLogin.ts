import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Demo Login Handler - Creates authenticated session for demo account
 * This function ensures the demo user exists and authenticates them
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log("🧪 DEMO LOGIN: Starting demo authentication flow");

    // STEP 1: Check if demo account exists and try to sign in
    try {
      const user = await base44.auth.signIn({
        email: "demo@habal.app",
        password: "demo1234"
      });

      if (user && user.id) {
        console.log("✅ DEMO LOGIN SUCCESS: User authenticated", { 
          user_id: user.id, 
          email: user.email,
          role: user.role 
        });
        
        return Response.json({
          success: true,
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name || "Demo Customer",
            role: user.role || "customer",
            is_demo_account: true
          }
        });
      }
    } catch (signInErr) {
      console.log("⚠️ DEMO ACCOUNT NOT FOUND: Will attempt to create", { error: signInErr.message });
    }

    // STEP 2: If sign-in failed, check if user exists but wrong password
    const db = base44.asServiceRole;
    const existingUsers = await db.entities.User.filter({ email: "demo@habal.app" }, "-created_date", 1);
    
    if (existingUsers && existingUsers.length > 0) {
      const demoUser = existingUsers[0];
      
      console.log("✅ DEMO ACCOUNT EXISTS: Returning user data", {
        user_id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role
      });
      
      // Update role to customer if needed
      if (demoUser.role !== "customer") {
        await db.entities.User.update(demoUser.id, { role: "customer" }).catch(() => {});
      }
      
      return Response.json({
        success: true,
        authenticated: true,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          full_name: demoUser.full_name || "Demo Customer",
          role: "customer",
          is_demo_account: true
        }
      });
    }

    // STEP 3: Create demo account if it doesn't exist
    console.log("🔨 CREATING DEMO ACCOUNT: User does not exist");
    
    try {
      // Use Base44 users.inviteUser to create the account
      await base44.users.inviteUser("demo@habal.app", "customer");
      
      console.log("✅ DEMO ACCOUNT CREATED: Invitation sent to demo@habal.app");
      
      // Wait a moment for account creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to fetch the newly created user
      const newUsers = await db.entities.User.filter({ email: "demo@habal.app" }, "-created_date", 1);
      
      if (newUsers && newUsers.length > 0) {
        const newUser = newUsers[0];
        return Response.json({
          success: true,
          authenticated: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.full_name || "Demo Customer",
            role: "customer",
            is_demo_account: true
          }
        });
      }
    } catch (createErr) {
      console.error("❌ DEMO ACCOUNT CREATION FAILED:", createErr.message);
    }

    // STEP 4: Fallback - return simulated user data
    console.warn("⚠️ FALLBACK MODE: Using simulated demo session");
    return Response.json({
      success: true,
      authenticated: false,
      fallback: true,
      user: {
        id: "demo-customer-sim",
        email: "demo@habal.app",
        full_name: "Demo Customer",
        role: "customer",
        is_demo_account: true
      },
      message: "Demo session created (fallback mode - limited functionality)"
    });

  } catch (error) {
    console.error("❌ DEMO LOGIN ERROR:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});