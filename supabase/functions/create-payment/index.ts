import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Discount {
  id: string;
  discount_type: string;
  min_days: number | null;
  max_days: number | null;
  discount_percent: number;
  promo_code: string | null;
  package_name: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

function findApplicableDiscount(
  discounts: Discount[], 
  packageName: string, 
  days: number,
  promoCode?: string | null
): Discount | null {
  const now = new Date();
  
  // Filter active discounts within valid date range
  const validDiscounts = discounts.filter(d => {
    if (!d.is_active) return false;
    if (d.start_date && new Date(d.start_date) > now) return false;
    if (d.end_date && new Date(d.end_date) < now) return false;
    return true;
  });

  // Priority 1: Promo code match
  if (promoCode) {
    const promoDiscount = validDiscounts.find(d => 
      d.discount_type === 'promo_code' && 
      d.promo_code?.toUpperCase() === promoCode.toUpperCase() &&
      (!d.package_name || d.package_name === packageName)
    );
    if (promoDiscount) return promoDiscount;
  }

  // Priority 2: Duration-based discount (find best match with range support)
  const durationDiscounts = validDiscounts
    .filter(d => {
      if (d.discount_type !== 'duration_based') return false;
      if (d.min_days === null) return false;
      if (days < d.min_days) return false;
      // Check max_days if set (range-based discount)
      if (d.max_days !== null && days > d.max_days) return false;
      if (d.package_name && d.package_name !== packageName) return false;
      return true;
    })
    .sort((a, b) => (b.min_days || 0) - (a.min_days || 0)); // Higher min_days first

  if (durationDiscounts.length > 0) {
    return durationDiscounts[0];
  }

  // Priority 3: Percentage discount (general)
  const percentageDiscount = validDiscounts.find(d => 
    d.discount_type === 'percentage' &&
    (!d.package_name || d.package_name === packageName)
  );
  if (percentageDiscount) return percentageDiscount;

  return null;
}

// Send Discord webhook notification
async function sendDiscordNotification(webhookUrl: string, orderData: {
  transactionId: string;
  customerName: string;
  packageName: string;
  duration: number;
  amount: number;
  status: string;
}) {
  if (!webhookUrl) return;

  try {
    const embed = {
      title: "🛒 New Order Received!",
      color: 0x00D4AA,
      fields: [
        { name: "Transaction ID", value: orderData.transactionId, inline: true },
        { name: "Customer/Key", value: orderData.customerName, inline: true },
        { name: "Package", value: orderData.packageName, inline: true },
        { name: "Duration", value: `${orderData.duration} days`, inline: true },
        { name: "Amount", value: `Rp ${orderData.amount.toLocaleString('id-ID')}`, inline: true },
        { name: "Status", value: orderData.status.toUpperCase(), inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "AXS Tools Payment System" }
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    console.log("Discord notification sent successfully");
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get payment settings from database
    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "cashify_license_key", 
        "cashify_qris_id", 
        "payment_mode",
        "discord_webhook_url",
        "qr_primary_url",
        "qr_fallback_url"
      ]);

    if (settingsError) {
      console.error("Failed to fetch settings:", settingsError);
    }

    console.log("Fetched settings:", settings);

    const settingsMap = Object.fromEntries(
      (settings || []).map((s: { key: string; value: string }) => [s.key, s.value])
    );

    const paymentMode = settingsMap.payment_mode || "demo";
    const licenseKey = (settingsMap.cashify_license_key || "").trim();
    const qrisId = (settingsMap.cashify_qris_id || "").trim();
    const discordWebhookUrl = (settingsMap.discord_webhook_url || "").trim();
    const qrPrimaryUrl = (settingsMap.qr_primary_url || "https://larabert-qrgen.hf.space/v1/create-qr-code?size=500x500&style=2&color=0f7bbb&data=").trim();
    const qrFallbackUrl = (settingsMap.qr_fallback_url || "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=").trim();
    
    console.log("Payment config:", { paymentMode, hasLicenseKey: !!licenseKey, hasQrisId: !!qrisId });

    // Get active discounts
    const { data: discounts } = await supabase
      .from("package_discounts")
      .select("*")
      .eq("is_active", true);

    const body = await req.json();
    const { 
      amount, 
      customerName, 
      packageName, 
      packageDuration,
      licenseKey: customerLicenseKey,
      promoCode,
      deviceId
    } = body;

    if (!amount || amount < 1000) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least 1000" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Calculate discount
    const applicableDiscount = findApplicableDiscount(
      discounts || [], 
      packageName || "NORMAL", 
      packageDuration || 1,
      promoCode
    );

    let originalAmount = amount;
    let discountAmount = 0;
    let discountPercent = 0;
    let discountInfo: { type: string; description: string } | null = null;

    if (applicableDiscount) {
      discountPercent = applicableDiscount.discount_percent;
      discountAmount = Math.floor(amount * (discountPercent / 100));
      discountInfo = {
        type: applicableDiscount.discount_type,
        description: applicableDiscount.discount_type === 'duration_based' 
          ? `Diskon ${discountPercent}% (min ${applicableDiscount.min_days} hari)`
          : applicableDiscount.discount_type === 'promo_code'
          ? `Kode promo ${applicableDiscount.promo_code}: ${discountPercent}% off`
          : `Diskon ${discountPercent}%`
      };
      console.log(`Discount applied: ${discountPercent}% (${discountAmount} IDR)`);
    }

    let finalAmount = amount - discountAmount;
    
    // Ensure minimum amount
    if (finalAmount < 1000) {
      finalAmount = 1000;
    }

    let qrString = "";
    let qrisUrl = "";
    let totalAmount = finalAmount;
    let cashifyTransactionId = "";
    let actualMode = paymentMode;

    // Check if live mode but credentials missing
    if (paymentMode === "live") {
      if (!licenseKey || !qrisId) {
        return new Response(
          JSON.stringify({ 
            error: "Cashify credentials not configured", 
            message: "Please configure cashify_license_key and cashify_qris_id in Admin Dashboard > Settings before using live mode",
            missing: {
              license_key: !licenseKey,
              qris_id: !qrisId
            }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Call Cashify API v2 for Dynamic QRIS
      try {
        console.log("Calling Cashify API v2 with:", { qrisId, amount: finalAmount, licenseKey: licenseKey.substring(0, 20) + "..." });
        
        const requestBody = {
          qr_id: qrisId,
          amount: finalAmount,
          useUniqueCode: true,
          packageIds: ["id.dana"],
          expiredInMinutes: 15,
          qrType: "dynamic",
          paymentMethod: "qris",
          useQris: true,
        };
        
        console.log("Request body:", JSON.stringify(requestBody));
        
        const cashifyResponse = await fetch("https://cashify.my.id/api/generate/v2/qris", {
          method: "POST",
          headers: {
            "x-license-key": licenseKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const cashifyData = await cashifyResponse.json();
        console.log("Cashify response:", JSON.stringify(cashifyData));

        if (cashifyData.status === 200 && cashifyData.data) {
          qrString = cashifyData.data.qr_string || "";
          cashifyTransactionId = cashifyData.data.transactionId || "";
          totalAmount = cashifyData.data.totalAmount || finalAmount;
          
          // Generate stylish QR code URL with fallback support
          qrisUrl = `${qrPrimaryUrl}${encodeURIComponent(qrString)}`;
        } else {
          console.error("Cashify API error:", cashifyData);
          return new Response(
            JSON.stringify({ 
              error: cashifyData.message || "Failed to generate QRIS from Cashify", 
              details: cashifyData 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (cashifyError) {
        console.error("Cashify API call failed:", cashifyError);
        return new Response(
          JSON.stringify({ error: "Cashify API connection failed", details: String(cashifyError) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Demo mode - generate fake QR for testing
      actualMode = "demo";
      qrString = `DEMO-${transactionId}`;
      qrisUrl = `${qrPrimaryUrl}${encodeURIComponent(qrString)}`;
      cashifyTransactionId = transactionId;
    }

    // Save transaction to database
    const { error: insertError } = await supabase.from("transactions").insert({
      transaction_id: cashifyTransactionId || transactionId,
      customer_name: customerName || "Customer",
      package_name: packageName || "NORMAL",
      package_duration: packageDuration || 1,
      original_amount: originalAmount,
      total_amount: totalAmount,
      status: "pending",
      qr_string: qrString,
      license_key: customerLicenseKey || null,
      expires_at: expiresAt.toISOString(),
      device_id: deviceId || null,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send realtime notification to developer via Discord
    sendDiscordNotification(discordWebhookUrl, {
      transactionId: cashifyTransactionId || transactionId,
      customerName: customerName || "Customer",
      packageName: packageName || "NORMAL",
      duration: packageDuration || 1,
      amount: totalAmount,
      status: "pending"
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: cashifyTransactionId || transactionId,
        qr_string: qrString,
        qris_url: qrisUrl,
        qr_fallback_url: `${qrFallbackUrl}${encodeURIComponent(qrString)}`,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        discountPercent: discountPercent,
        discountInfo: discountInfo,
        totalAmount: totalAmount,
        expiresAt: expiresAt.toISOString(),
        mode: actualMode,
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