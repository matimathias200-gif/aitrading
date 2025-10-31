import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { transaction_hash, status } = await req.json();

    if (!transaction_hash) {
      throw new Error('Missing transaction_hash');
    }

    // Find payment
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_hash', transaction_hash)
      .single();

    if (findError || !payment) {
      throw new Error('Payment not found');
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: status || 'confirmed' })
      .eq('id', payment.id);

    if (updateError) throw updateError;

    // If confirmed, activate subscription
    if (status === 'confirmed' || !status) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          plan: payment.plan,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.user_id);

      if (profileError) throw profileError;

      console.log(`[verify-payment] Subscription activated for user ${payment.user_id}`);
    }

    return new Response(
      JSON.stringify({ success: true, payment }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-payment] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});