import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Demo account credentials (pre-created users in the system)
const DEMO_ACCOUNTS = {
  customer:   { email: "demo.customer@habal.app",   password: "Demo@1234" },
  rider:      { email: "demo.rider@habal.app",      password: "Demo@1234" },
  dispatcher: { email: "demo.dispatcher@habal.app", password: "Demo@1234" },
  operator:   { email: "demo.operator@habal.app",   password: "Demo@1234" },
  admin:      { email: "demo.admin@habal.app",      password: "Demo@1234" },
};

Deno.serve(async (req) => {
  try {
    const { role } = await req.json();

    const account = DEMO_ACCOUNTS[role?.toLowerCase()];
    if (!account) {
      return Response.json({ error: "Invalid demo role" }, { status: 400 });
    }

    // Use Base44 auth to sign in with email/password
    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.auth.signInWithPassword(account.email, account.password);

    if (!result?.access_token) {
      return Response.json({ error: "Demo login failed" }, { status: 401 });
    }

    return Response.json({ access_token: result.access_token, user: result.user });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});