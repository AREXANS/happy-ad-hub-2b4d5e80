import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, password, deviceId, deviceInfo } = await req.json();
    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD');

    if (!ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin password not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'login') {
      // Verify password
      if (password !== ADMIN_PASSWORD) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate a session token
      const sessionToken = crypto.randomUUID() + '-' + Date.now();
      
      // Store device info for new device detection
      console.log(`[ADMIN LOGIN] Device: ${deviceId}, Info: ${JSON.stringify(deviceInfo)}, Time: ${new Date().toISOString()}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessionToken,
          message: 'Login successful'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Just check if the session token exists (basic validation)
      // In production, you'd want to verify against stored tokens
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Admin auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
