import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * EVALUATE-TRADES
 * Auto-évalue les signaux passés pour déterminer WIN/LOSS/NEUTRAL
 * Tourne toutes les 2h via cron job
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[evaluate-trades] Starting evaluation...');

    // 1. Récupérer tous les signaux non évalués (created < 24h ago)
    const { data: signals, error: signalsError } = await supabase
      .from('crypto_signals')
      .select('*')
      .eq('status', 'active')
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // au moins 1h old
      .is('evaluated_at', null);

    if (signalsError) {
      throw new Error(`Failed to fetch signals: ${signalsError.message}`);
    }

    if (!signals || signals.length === 0) {
      console.log('[evaluate-trades] No signals to evaluate');
      return new Response(
        JSON.stringify({ success: true, evaluated: 0, message: 'No signals to evaluate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[evaluate-trades] Found ${signals.length} signals to evaluate`);

    // 2. Fetch current BTC price
    let currentPrice = 0;
    try {
      const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      if (binanceRes.ok) {
        const binanceData = await binanceRes.json();
        currentPrice = parseFloat(binanceData.price);
      }
    } catch (e) {
      console.log('[evaluate-trades] Binance failed, trying CoinGecko...');
    }

    if (!currentPrice) {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        currentPrice = cgData.bitcoin.usd;
      }
    }

    if (!currentPrice) {
      throw new Error('Failed to fetch current BTC price');
    }

    console.log(`[evaluate-trades] Current BTC price: ${currentPrice}`);

    // 3. Évaluer chaque signal
    let evaluated = 0;
    const results = [];

    for (const signal of signals) {
      const entryPrice = parseFloat(signal.entry_price);
      const takeProfit = parseFloat(signal.take_profit);
      const stopLoss = parseFloat(signal.stop_loss);
      const signalType = signal.signal_type;

      let result = 'NEUTRAL';
      let profitPct = 0;
      let exitPrice = currentPrice;

      // Check if TP or SL was hit
      if (signalType === 'BUY') {
        if (currentPrice >= takeProfit) {
          result = 'WIN';
          exitPrice = takeProfit;
          profitPct = ((takeProfit - entryPrice) / entryPrice) * 100;
        } else if (currentPrice <= stopLoss) {
          result = 'LOSS';
          exitPrice = stopLoss;
          profitPct = ((stopLoss - entryPrice) / entryPrice) * 100;
        } else {
          // Check horizon expiration
          const horizonMs = (signal.horizon_minutes || 240) * 60 * 1000;
          const createdAt = new Date(signal.created_at).getTime();
          if (Date.now() - createdAt > horizonMs) {
            result = 'NEUTRAL';
            profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;
          }
        }
      } else if (signalType === 'SELL') {
        if (currentPrice <= takeProfit) {
          result = 'WIN';
          exitPrice = takeProfit;
          profitPct = ((entryPrice - takeProfit) / entryPrice) * 100;
        } else if (currentPrice >= stopLoss) {
          result = 'LOSS';
          exitPrice = stopLoss;
          profitPct = ((entryPrice - stopLoss) / entryPrice) * 100;
        } else {
          const horizonMs = (signal.horizon_minutes || 240) * 60 * 1000;
          const createdAt = new Date(signal.created_at).getTime();
          if (Date.now() - createdAt > horizonMs) {
            result = 'NEUTRAL';
            profitPct = ((entryPrice - currentPrice) / entryPrice) * 100;
          }
        }
      }

      // Only evaluate if result is determined (not still pending)
      if (result !== 'NEUTRAL' || signal.horizon_minutes) {
        // Insert into trade_feedback
        const { error: feedbackError } = await supabase
          .from('trade_feedback')
          .insert({
            signal_id: signal.id,
            symbol: signal.symbol || 'BTCUSDT',
            signal_type: signalType,
            entry_price: entryPrice,
            take_profit: takeProfit,
            stop_loss: stopLoss,
            confidence: signal.confidence,
            result,
            pnl_percent: profitPct,
            is_manual_feedback: false
          });

        if (feedbackError) {
          console.error(`Failed to insert feedback for signal ${signal.id}:`, feedbackError);
          continue;
        }

        // Update signal as evaluated
        const { error: updateError } = await supabase
          .from('crypto_signals')
          .update({
            status: result === 'WIN' ? 'completed' : result === 'LOSS' ? 'failed' : 'expired',
            evaluated_at: new Date().toISOString()
          })
          .eq('id', signal.id);

        if (updateError) {
          console.error(`Failed to update signal ${signal.id}:`, updateError);
        }

        evaluated++;
        results.push({
          signal_id: signal.id,
          result,
          profit_pct: profitPct.toFixed(2),
          exit_price: exitPrice
        });

        console.log(`[evaluate-trades] Signal ${signal.id}: ${result} (${profitPct.toFixed(2)}%)`);
      }
    }

    console.log(`[evaluate-trades] Evaluated ${evaluated} signals`);

    return new Response(
      JSON.stringify({
        success: true,
        evaluated,
        current_price: currentPrice,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[evaluate-trades] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
