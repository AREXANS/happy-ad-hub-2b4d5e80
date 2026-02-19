import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface KeyData {
  key: string;
  expired: string;
  role: string;
  maxHwid: number;
  frozenUntil: string | null;
  frozenRemainingMs?: number;
  hwids: string[];
  robloxUsers: {
    hwid: string;
    username: string;
    registeredAt: string;
  }[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { key, hwid, robloxUsername } = await req.json();

    if (!key) {
      return new Response(
        JSON.stringify({ success: false, error: "Key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get keys from site_settings
    const { data: settingData, error: settingError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "license_keys")
      .maybeSingle();

    if (settingError || !settingData) {
      return new Response(
        JSON.stringify({ success: false, error: "Key database not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let keys: KeyData[] = [];
    try {
      keys = JSON.parse(settingData.value);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid key database format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the key
    const keyIndex = keys.findIndex((k) => k.key === key);
    if (keyIndex === -1) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keyData = keys[keyIndex];
    const now = new Date();

    // Check if key is frozen
    if (keyData.frozenUntil) {
      // Calculate frozen remaining time
      const frozenUntilDate = new Date(keyData.frozenUntil);
      const frozenDiffMs = frozenUntilDate.getTime() - now.getTime();
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          valid: false,
          error: "Key is frozen",
          frozen: true,
          // Key info even when frozen
          key: keyData.key,
          role: keyData.role,
          expired: keyData.expired,
          // Freeze details - real-time
          frozenUntil: keyData.frozenUntil,
          frozenRemainingMs: keyData.frozenRemainingMs || frozenDiffMs,
          frozenRemainingText: frozenDiffMs > 0 
            ? `${Math.floor(frozenDiffMs / (1000 * 60 * 60 * 24))}d ${Math.floor((frozenDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}h`
            : "Permanent",
          // HWID info
          hwidCount: keyData.hwids?.length || 0,
          maxHwid: keyData.maxHwid || 1
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    const expiredDate = new Date(keyData.expired);
    if (expiredDate < now) {
      // Calculate how long ago it expired
      const expiredAgoMs = now.getTime() - expiredDate.getTime();
      const expiredAgoDays = Math.floor(expiredAgoMs / (1000 * 60 * 60 * 24));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          valid: false,
          error: "Key has expired", 
          expired: true,
          // Key info even when expired
          key: keyData.key,
          role: keyData.role,
          expiredAt: keyData.expired,
          expiredAgoMs,
          expiredAgoText: expiredAgoDays > 0 ? `${expiredAgoDays} days ago` : "Recently",
          // HWID info
          hwidCount: keyData.hwids?.length || 0,
          maxHwid: keyData.maxHwid || 1,
          frozen: false
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle HWID registration if provided
    let hwidStatus = "not_checked";
    if (hwid) {
      const existingHwids = keyData.hwids || [];
      const maxHwid = keyData.maxHwid || 1;

      if (existingHwids.includes(hwid)) {
        hwidStatus = "registered";
      } else if (existingHwids.length >= maxHwid) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Maximum devices reached (${maxHwid})`,
            hwid_limit_reached: true
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Register new HWID
        keyData.hwids = [...existingHwids, hwid];
        
        // Add roblox user if provided
        if (robloxUsername) {
          keyData.robloxUsers = keyData.robloxUsers || [];
          const existingUser = keyData.robloxUsers.find((u) => u.hwid === hwid);
          if (!existingUser) {
            keyData.robloxUsers.push({
              hwid,
              username: robloxUsername,
              registeredAt: now.toISOString(),
            });
          }
        }

        hwidStatus = "newly_registered";

        // Update the key in database
        keys[keyIndex] = keyData;
        await supabase
          .from("site_settings")
          .update({ value: JSON.stringify(keys), updated_at: now.toISOString() })
          .eq("key", "license_keys");
      }
    }

    // Get main script URL
    const scriptUrl = `${supabaseUrl}/functions/v1/get-script?name=main`;

    // Calculate remaining time (reuse expiredDate from line 112)
    const diffMs = expiredDate.getTime() - now.getTime();
    const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secondsRemaining = Math.floor((diffMs % (1000 * 60)) / 1000);

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        message: "Key validated successfully",
        // Key info - real-time data from database
        key: keyData.key,
        role: keyData.role,
        expired: keyData.expired,
        expiredTimestamp: expiredDate.getTime(),
        // Time remaining - calculated real-time
        daysRemaining,
        hoursRemaining,
        minutesRemaining,
        secondsRemaining,
        timeRemainingMs: diffMs,
        timeRemainingText: `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s`,
        // HWID info
        hwid_status: hwidStatus,
        hwid: hwid || null,
        hwidCount: keyData.hwids?.length || 0,
        maxHwid: keyData.maxHwid || 1,
        registeredHwids: keyData.hwids || [],
        // Freeze status
        frozen: false,
        frozenUntil: null,
        frozenRemainingMs: null,
        // Roblox users
        robloxUsers: keyData.robloxUsers || [],
        // Script URL
        scriptUrl: scriptUrl
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
