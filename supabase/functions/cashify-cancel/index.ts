import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CASHIFY_LICENSE_KEY = Deno.env.get('CASHIFY_LICENSE_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!CASHIFY_LICENSE_KEY) {
      throw new Error('Cashify credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { transactionId } = await req.json();

    console.log('Cancelling transaction:', transactionId);

    // Cancel on Cashify
    const response = await fetch('https://cashify.my.id/api/generate/cancel-status', {
      method: 'POST',
      headers: {
        'x-license-key': CASHIFY_LICENSE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactionId }),
    });

    const data = await response.json();
    console.log('Cashify cancel response:', data);

    // Update database
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Transaksi dibatalkan',
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
