import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface RobloxUser {
  hwid: string;
  username: string;
  registeredAt: string;
}

interface KeyData {
  key: string;
  expired: string;
  role: string;
  maxHwid: number;
  frozenUntil: string | null;
  hwids: string[];
  robloxUsers: RobloxUser[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json"; // json, lua, raw

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get keys from site_settings
    const { data: settingData, error: settingError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "license_keys")
      .single();

    // Get manual whitelist
    const { data: manualData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "manual_whitelist")
      .single();

    const now = new Date();
    
    // Collect all whitelisted usernames from active (non-expired, non-frozen) keys
    const whitelistedUsers: { username: string; role: string; key: string; expiredAt: string; source: string }[] = [];
    const usernameSet = new Set<string>();

    // Add manual whitelist users first
    if (manualData?.value) {
      try {
        const manualUsers = JSON.parse(manualData.value);
        if (Array.isArray(manualUsers)) {
          for (const user of manualUsers) {
            if (user.username && !usernameSet.has(user.username.toLowerCase())) {
              usernameSet.add(user.username.toLowerCase());
              whitelistedUsers.push({
                username: user.username,
                role: "Manual",
                key: "manual",
                expiredAt: "never",
                source: "manual"
              });
            }
          }
        }
      } catch {
        console.error("Failed to parse manual whitelist");
      }
    }

    // Add key-based whitelist users
    if (settingData?.value) {
      let keys: KeyData[] = [];
      try {
        keys = JSON.parse(settingData.value);
      } catch {
        console.error("Failed to parse license keys");
      }

      for (const keyData of keys) {
        // Skip expired keys
        const expiredDate = new Date(keyData.expired);
        if (expiredDate < now) continue;

        // Skip frozen keys
        if (keyData.frozenUntil) continue;

        // Add all roblox users from this key
        if (keyData.robloxUsers && Array.isArray(keyData.robloxUsers)) {
          for (const user of keyData.robloxUsers) {
            if (user.username && !usernameSet.has(user.username.toLowerCase())) {
              usernameSet.add(user.username.toLowerCase());
              whitelistedUsers.push({
                username: user.username,
                role: keyData.role,
                key: keyData.key.slice(0, 8) + "...",
                expiredAt: keyData.expired,
                source: "key"
              });
            }
          }
        }
      }
    }

    console.log(`Whitelist fetched: ${whitelistedUsers.length} users`);

    // Return based on format
    if (format === "lua") {
      // Return as Lua table format
      const luaTable = whitelistedUsers.map(u => `"${u.username}"`).join(", ");
      const luaCode = `-- Auto-generated whitelist from Arexans System
-- Total users: ${whitelistedUsers.length}
-- Generated at: ${now.toISOString()}

return {${luaTable}}`;
      
      return new Response(luaCode, {
        status: 200,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
      });
    }

    if (format === "raw") {
      // Return just usernames, one per line
      const rawList = whitelistedUsers.map(u => u.username).join("\n");
      return new Response(rawList, {
        status: 200,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
      });
    }

    // Default: JSON format
    return new Response(
      JSON.stringify({
        success: true,
        count: whitelistedUsers.length,
        users: whitelistedUsers,
        usernames: whitelistedUsers.map(u => u.username),
        generatedAt: now.toISOString()
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        } 
      }
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
