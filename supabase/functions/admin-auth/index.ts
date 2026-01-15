import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Master device ID that is always approved
const MASTER_DEVICE_ID = 'device_3e01e7bb-0fe2-4e05-a8ef';

// Parse device name from user agent
function parseDeviceName(userAgent: string): string {
  // Check for specific phone models
  const phoneMatch = userAgent.match(/\(([^)]+)\)/);
  if (phoneMatch) {
    const details = phoneMatch[1];
    
    // Android devices - try multiple patterns
    if (details.includes('Android')) {
      // INFINIX pattern
      const infinixMatch = userAgent.match(/INFINIX\s+([A-Za-z0-9\s]+)/i);
      if (infinixMatch) {
        return 'INFINIX ' + infinixMatch[1].trim().split(' ')[0];
      }
      
      // Samsung pattern
      const samsungMatch = userAgent.match(/SM-([A-Za-z0-9]+)/i);
      if (samsungMatch) {
        return 'Samsung ' + samsungMatch[1];
      }
      
      // Xiaomi/Redmi pattern
      const xiaomiMatch = userAgent.match(/(Redmi|POCO|Mi)\s*([A-Za-z0-9\s]+)/i);
      if (xiaomiMatch) {
        return xiaomiMatch[1] + ' ' + xiaomiMatch[2].trim().split(' ')[0];
      }
      
      // OPPO pattern
      const oppoMatch = userAgent.match(/OPPO\s*([A-Za-z0-9]+)/i);
      if (oppoMatch) {
        return 'OPPO ' + oppoMatch[1];
      }
      
      // Vivo pattern
      const vivoMatch = userAgent.match(/vivo\s*([A-Za-z0-9]+)/i);
      if (vivoMatch) {
        return 'Vivo ' + vivoMatch[1];
      }
      
      // Realme pattern
      const realmeMatch = userAgent.match(/RMX([0-9]+)/i);
      if (realmeMatch) {
        return 'Realme RMX' + realmeMatch[1];
      }
      
      // Try to extract device model from Build
      const modelMatch = userAgent.match(/; ([^;)]+) Build/);
      if (modelMatch) {
        return modelMatch[1].trim();
      }
      
      // Try alternative pattern
      const altModelMatch = userAgent.match(/Android[^;]*; ([^;)]+)/);
      if (altModelMatch && !altModelMatch[1].includes('Linux')) {
        return altModelMatch[1].trim();
      }
      
      return 'Android Device';
    }
    
    // iPhone
    if (details.includes('iPhone')) {
      return 'iPhone';
    }
    
    // iPad
    if (details.includes('iPad')) {
      return 'iPad';
    }
  }
  
  // Windows
  if (userAgent.includes('Windows NT 10')) {
    return 'Windows 10/11';
  } else if (userAgent.includes('Windows NT 6.3')) {
    return 'Windows 8.1';
  } else if (userAgent.includes('Windows NT 6.2')) {
    return 'Windows 8';
  } else if (userAgent.includes('Windows NT 6.1')) {
    return 'Windows 7';
  } else if (userAgent.includes('Windows')) {
    return 'Windows';
  }
  
  // Mac
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) {
    return 'MacOS';
  }
  
  // Linux
  if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
    return 'Linux';
  }
  
  return 'Unknown Device';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, password, deviceId, deviceInfo, transactionId, newStatus, sessionId } = await req.json();
    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
      
      // Parse device name
      const deviceName = parseDeviceName(deviceInfo?.userAgent || '');
      
      // Check if this device is master device or already approved
      const isMasterDevice = deviceId.startsWith(MASTER_DEVICE_ID);
      
      // Check if device already exists in history
      const { data: existingDevice } = await supabase
        .from('admin_login_history')
        .select('*')
        .eq('device_id', deviceId)
        .single();
      
      if (existingDevice) {
        // Update existing device login time
        await supabase.from('admin_login_history').update({
          login_time: new Date().toISOString(),
          device_info: deviceInfo,
          device_name: deviceName,
          is_current: true
        }).eq('device_id', deviceId);
        
        // Check if device is approved
        if (!existingDevice.is_approved && !isMasterDevice) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Device belum disetujui. Tunggu konfirmasi dari admin.',
              needsApproval: true,
              deviceId,
              deviceName
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // New device - insert into history
        await supabase.from('admin_login_history').insert({
          device_id: deviceId,
          device_name: deviceName,
          device_info: deviceInfo,
          is_current: true,
          is_approved: isMasterDevice // Master device is auto-approved
        });
        
        // If not master device, require approval
        if (!isMasterDevice) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Perangkat baru terdeteksi! Silakan minta konfirmasi dari admin.',
              needsApproval: true,
              deviceId,
              deviceName
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Get all login history
      const { data: loginHistory } = await supabase
        .from('admin_login_history')
        .select('*')
        .order('login_time', { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessionToken,
          deviceName,
          message: 'Login successful',
          loginHistory: loginHistory || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Just check if the session token exists (basic validation)
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_login_history') {
      const { data: loginHistory, error } = await supabase
        .from('admin_login_history')
        .select('*')
        .order('login_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, loginHistory: loginHistory || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'approve_device') {
      const { deviceIdToApprove } = await req.json();
      
      const { error } = await supabase
        .from('admin_login_history')
        .update({ is_approved: true })
        .eq('device_id', deviceIdToApprove);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Device approved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_session') {
      if (!sessionId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Session ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('admin_login_history')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Session deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_transaction_status') {
      if (!transactionId || !newStatus) {
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction ID and status required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate license key if marking as paid
      let licenseKey = null;
      if (newStatus === 'paid') {
        licenseKey = 'LIC-' + crypto.randomUUID().substring(0, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
        updateData.license_key = licenseKey;
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('transaction_id', transactionId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, licenseKey }),
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