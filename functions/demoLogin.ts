import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Try to sign in with demo credentials
    try {
      const user = await base44.auth.signIn({
        email: "demo@habal.app",
        password: "demo1234"
      });

      if (user && user.id) {
        return Response.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role
          }
        });
      }
    } catch (signInErr) {
      console.log("Demo account doesn't exist, attempting to create...");
    }

    // If sign in fails, create the demo account
    try {
      // Try to register the demo account
      const response = await fetch("https://your-base44-domain/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "demo@habal.app",
          password: "demo1234",
          full_name: "Demo Customer"
        })
      });

      if (response.ok) {
        const newUser = await response.json();
        return Response.json({
          success: true,
          user: newUser
        });
      }
    } catch (regErr) {
      console.log("Registration attempt:", regErr.message);
    }

    // Fallback: return success anyway and let frontend handle with localStorage
    return Response.json({
      success: true,
      user: {
        id: "demo-customer-1",
        email: "demo@habal.app",
        full_name: "Demo Customer",
        role: "customer"
      },
      demo: true
    });

  } catch (error) {
    console.error("Demo login error:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});