import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transactionId, deviceId, forceRecreate } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Transaction ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Must be claimable, claimed (for recreate), or paid
    const allowedStatuses = ['claimable', 'claimed', 'paid'];
    if (!forceRecreate && transaction.status !== 'claimable') {
      return new Response(
        JSON.stringify({ error: "Transaction is not claimable", status: transaction.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (forceRecreate && !allowedStatuses.includes(transaction.status)) {
      return new Response(
        JSON.stringify({ error: "Transaction status invalid for key recreation", status: transaction.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const licenseKey = transaction.license_key;

    if (!licenseKey) {
      return new Response(
        JSON.stringify({ error: "No license key found in transaction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Directly read and update license_keys in site_settings (no edge function calls)
    const { data: keysData, error: keysError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "license_keys")
      .maybeSingle();

    if (keysError) {
      console.error("Failed to read license keys:", keysError);
      return new Response(
        JSON.stringify({ error: "Failed to read license keys" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let keys: any[] = [];
    if (keysData) {
      try {
        keys = JSON.parse(keysData.value || "[]");
      } catch {
        keys = [];
      }
    }

    const existingKeyIndex = keys.findIndex((k: any) => k.key === licenseKey);
    let newExpiry: Date;

    if (existingKeyIndex >= 0 && !forceRecreate) {
      const existingKey = keys[existingKeyIndex];
      const currentExpiry = new Date(existingKey.expired);
      if (currentExpiry < now) {
        // Key expired, start fresh from now
        newExpiry = new Date(now.getTime() + (transaction.package_duration * 24 * 60 * 60 * 1000));
      } else {
        // Key still valid, extend from current expiry
        newExpiry = new Date(currentExpiry.getTime() + (transaction.package_duration * 24 * 60 * 60 * 1000));
      }
      // Update existing key
      keys[existingKeyIndex] = {
        ...existingKey,
        expired: newExpiry.toISOString(),
        role: transaction.package_name,
      };
    } else if (existingKeyIndex >= 0 && forceRecreate) {
      // Force recreate - reset expiry from now
      newExpiry = new Date(now.getTime() + (transaction.package_duration * 24 * 60 * 60 * 1000));
      keys[existingKeyIndex] = {
        ...keys[existingKeyIndex],
        expired: newExpiry.toISOString(),
        role: transaction.package_name,
      };
    } else {
      // Create new key starting from now
      newExpiry = new Date(now.getTime() + (transaction.package_duration * 24 * 60 * 60 * 1000));
      keys.push({
        key: licenseKey,
        expired: newExpiry.toISOString(),
        created: now.toISOString(),
        role: transaction.package_name,
        maxHwid: 1,
        frozenUntil: null,
        frozenRemainingMs: null,
        hwids: [],
        robloxUsers: [],
      });
    }

    // Save updated keys directly to database
    const { error: updateError } = await supabase
      .from("site_settings")
      .update({ value: JSON.stringify(keys), updated_at: now.toISOString() })
      .eq("key", "license_keys");

    if (updateError) {
      console.error("Failed to update license keys:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save license key: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction to claimed
    await supabase
      .from("transactions")
      .update({ 
        status: "claimed",
        paid_at: now.toISOString()
      })
      .eq("transaction_id", transactionId);

    console.log(`Key ${forceRecreate ? 'recreated' : 'claimed'}: ${licenseKey}, expires: ${newExpiry.toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        key: licenseKey,
        package: transaction.package_name,
        days: transaction.package_duration,
        expired: newExpiry.toISOString(),
        expiredDisplay: newExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
        recreated: !!forceRecreate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
