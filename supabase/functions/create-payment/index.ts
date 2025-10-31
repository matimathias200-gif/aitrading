import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const { user_id, plan, amount } = await req.json();

    if (!user_id || !plan || !amount) {
      throw new Error('Missing required fields');
    }

    // Generate unique transaction ID
    const transaction_id = `neura_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store pending payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id,
        transaction_hash: transaction_id,
        amount,
        currency: 'USD',
        status: 'pending',
        plan
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // In production, integrate with NOWPayments, CoinPayments or BTCPay Server
    // For now, return mock payment URL
    const payment_url = `https://payment.neuratrade.ai/pay/${transaction_id}`;

    // TODO: Replace with real payment gateway
    // const nowPaymentsResponse = await fetch('https://api.nowpayments.io/v1/payment', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': Deno.env.get('NOWPAYMENTS_API_KEY'),
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     price_amount: amount,
    //     price_currency: 'usd',
    //     pay_currency: 'btc',
    //     ipn_callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`,
    //     order_id: payment.id,
    //     order_description: `NEURA TRADE AI - ${plan} Plan`
    //   })
    // });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        payment_url,
        transaction_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-payment] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});