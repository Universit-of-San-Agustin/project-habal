import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { demo_account } = await req.json();

    // Validate demo account request
    if (!demo_account || demo_account !== 'customer') {
      return Response.json(
        { error: 'Invalid demo account' },
        { status: 400 }
      );
    }

    // Demo user credentials
    const demoUser = {
      email: `customer_demo_${Date.now()}@habal.demo`,
      full_name: 'Demo Customer',
      role: 'user',
      is_demo_account: true,
    };

    // Create or find demo user in database
    try {
      const existingUser = await base44.entities.User.filter(
        { email: demoUser.email },
        '-created_date',
        1
      );

      if (existingUser && existingUser.length > 0) {
        // Use existing demo user
        const user = existingUser[0];
        return Response.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_demo_account: true,
          },
          demo_session: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.log('No existing demo user found, will create new session');
    }

    // Return demo user session
    return Response.json({
      success: true,
      user: {
        id: `demo_${Date.now()}`,
        email: demoUser.email,
        full_name: demoUser.full_name,
        role: demoUser.role,
        is_demo_account: true,
      },
      demo_session: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return Response.json(
      { error: 'Demo login failed', details: error.message },
      { status: 500 }
    );
  }
});