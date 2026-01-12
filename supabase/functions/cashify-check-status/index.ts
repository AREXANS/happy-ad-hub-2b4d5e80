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
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');

    if (!CASHIFY_LICENSE_KEY) {
      throw new Error('Cashify credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { transactionId } = await req.json();

    console.log('Checking status for:', transactionId);

    // Check status from Cashify
    const response = await fetch('https://cashify.my.id/api/generate/check-status', {
      method: 'POST',
      headers: {
        'x-license-key': CASHIFY_LICENSE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactionId }),
    });

    const data = await response.json();
    console.log('Cashify status response:', data);

    if (data.status !== 200 || !data.data) {
      throw new Error(data.message || 'Failed to check status');
    }

    const paymentStatus = data.data.status;

    // If paid, generate license key and update database
    if (paymentStatus === 'paid') {
      // Get transaction details
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (txError || !txData) {
        throw new Error('Transaction not found');
      }

      // Check if already processed
      if (txData.status === 'paid' && txData.license_key) {
        return new Response(JSON.stringify({
          success: true,
          status: 'paid',
          licenseKey: txData.license_key,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use customer_name as the key
      const licenseKey = txData.customer_name;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + txData.package_duration);

      // Save license key to GitHub
      if (GITHUB_TOKEN) {
        await saveLicenseToGitHub(GITHUB_TOKEN, licenseKey, {
          package: txData.package_name,
          expired: expiryDate.toISOString(),
          created_at: new Date().toISOString(),
        });
      }

      // Update transaction in database
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'paid',
          license_key: licenseKey,
          paid_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId);

      if (updateError) {
        console.error('Update error:', updateError);
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'paid',
        licenseKey: licenseKey,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status in database if changed
    if (paymentStatus !== 'pending') {
      await supabase
        .from('transactions')
        .update({ status: paymentStatus })
        .eq('transaction_id', transactionId);
    }

    return new Response(JSON.stringify({
      success: true,
      status: paymentStatus,
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

async function saveLicenseToGitHub(token: string, licenseKey: string, data: { package: string; expired: string; created_at: string }) {
  const owner = 'AREXANS';
  const repo = 'cupapi';
  const path = 'keksoeldlkdkd.json';

  try {
    // Get current file content
    const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let existingLicenses: any[] = [];
    let sha = '';

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
      const content = atob(fileData.content);
      try {
        existingLicenses = JSON.parse(content);
      } catch {
        existingLicenses = [];
      }
    }

    // Add new license in exact format
    existingLicenses.push({
      key: licenseKey,
      package: data.package,
      expired: data.expired,
      created_at: data.created_at,
    });

    // Update file
    const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add license key: ${licenseKey}`,
        content: btoa(JSON.stringify(existingLicenses, null, 2)),
        sha: sha || undefined,
      }),
    });

    if (!updateResponse.ok) {
      console.error('GitHub update failed:', await updateResponse.text());
    } else {
      console.log('License saved to GitHub:', licenseKey);
    }
  } catch (error) {
    console.error('GitHub error:', error);
  }
}
