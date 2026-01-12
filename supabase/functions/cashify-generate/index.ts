import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CASHIFY_LICENSE_KEY = Deno.env.get('CASHIFY_LICENSE_KEY');
    const CASHIFY_QRIS_ID = Deno.env.get('CASHIFY_QRIS_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!CASHIFY_LICENSE_KEY || !CASHIFY_QRIS_ID) {
      throw new Error('Cashify credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { customerName, customerEmail, customerWhatsapp, packageName, packageDuration, amount } = await req.json();

    console.log('Generating QRIS for:', { customerName, packageName, amount });

    // Generate QRIS using Cashify API v2
    const response = await fetch('https://cashify.my.id/api/generate/v2/qris', {
      method: 'POST',
      headers: {
        'x-license-key': CASHIFY_LICENSE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qr_id: CASHIFY_QRIS_ID,
        amount: amount,
        useUniqueCode: true,
        packageIds: ["id.dana"],
        expiredInMinutes: 15,
        qrType: "dynamic",
        paymentMethod: "qris",
        useQris: true
      }),
    });

    const data = await response.json();
    console.log('Cashify response:', data);

    if (data.status !== 200 || !data.data) {
      throw new Error(data.message || 'Failed to generate QRIS');
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Save transaction to database
    const { error: dbError } = await supabase.from('transactions').insert({
      transaction_id: data.data.transactionId,
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_whatsapp: customerWhatsapp,
      package_name: packageName,
      package_duration: packageDuration,
      original_amount: data.data.originalAmount,
      total_amount: data.data.totalAmount,
      unique_nominal: data.data.uniqueNominal || 0,
      qr_string: data.data.qr_string,
      status: 'pending',
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save transaction');
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        transactionId: data.data.transactionId,
        qr_string: data.data.qr_string,
        originalAmount: data.data.originalAmount,
        totalAmount: data.data.totalAmount,
        uniqueNominal: data.data.uniqueNominal,
        expiresAt: expiresAt,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
