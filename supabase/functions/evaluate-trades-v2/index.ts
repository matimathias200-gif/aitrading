import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    console.log('[evaluate-trades-v2] Starting evaluation with pattern learning...');

    const { data: signals, error: signalsError } = await supabase
      .from('crypto_signals')
      .select('*')
      .eq('status', 'active')
      .eq('symbol', 'BTCUSDT')
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .is('evaluated_at', null);

    if (signalsError) throw new Error(`Failed to fetch signals: ${signalsError.message}`);

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, evaluated: 0, message: 'No signals to evaluate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[evaluate-trades-v2] Found ${signals.length} signals to evaluate`);

    let currentPrice = 0;
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      if (res.ok) {
        const data = await res.json();
        currentPrice = parseFloat(data.price);
      }
    } catch (e) {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      if (res.ok) {
        const data = await res.json();
        currentPrice = data.bitcoin.usd;
      }
    }

    if (!currentPrice) throw new Error('Failed to fetch current BTC price');

    console.log(`[evaluate-trades-v2] Current BTC price: ${currentPrice}`);

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
          const horizonMs = (signal.horizon_minutes || 240) * 60 * 1000;
          const createdAt = new Date(signal.created_at).getTime();
          if (Date.now() - createdAt > horizonMs) {
            result = 'NEUTRAL';
            profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;
          }
        }
      }

      else if (signalType === 'SELL') {
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

      if (result !== 'NEUTRAL' || signal.horizon_minutes) {
        await supabase.from('trade_feedback').insert({
          signal_id: signal.id,
          symbol: 'BTCUSDT',
          signal_type: signalType,
          entry_price: entryPrice,
          take_profit: takeProfit,
          stop_loss: stopLoss,
          confidence: signal.confidence,
          result,
          pnl_percent: profitPct,
          is_manual_feedback: false
        });

        await supabase.from('crypto_signals').update({
          status: result === 'WIN' ? 'completed' : result === 'LOSS' ? 'failed' : 'expired',
          evaluated_at: new Date().toISOString()
        }).eq('id', signal.id);

        try {
          const reason = typeof signal.reason === 'string' ? JSON.parse(signal.reason) : signal.reason;
          const patternName = reason.pattern || 'unknown_pattern';

          await supabase.rpc('update_signal_pattern', {
            p_pattern_name: patternName,
            p_pattern_conditions: {
              signal_type: signalType,
              confidence: signal.confidence,
              entry_price: entryPrice
            },
            p_result: result,
            p_pnl_percent: profitPct
          });

          console.log(`[evaluate-trades-v2] Pattern updated: ${patternName} -> ${result} (${profitPct.toFixed(2)}%)`);
        } catch (e) {
          console.warn('[evaluate-trades-v2] Failed to update pattern:', e.message);
        }

        evaluated++;
        results.push({
          signal_id: signal.id,
          result,
          profit_pct: profitPct.toFixed(2),
          exit_price: exitPrice
        });

        console.log(`[evaluate-trades-v2] Signal ${signal.id}: ${result} (${profitPct.toFixed(2)}%)`);
      }
    }

    await updateReputation(supabase);

    console.log(`[evaluate-trades-v2] Evaluated ${evaluated} signals`);

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
    console.error('[evaluate-trades-v2] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateReputation(supabase: any) {
  const { data: feedback } = await supabase
    .from('trade_feedback')
    .select('result')
    .eq('symbol', 'BTCUSDT');

  if (!feedback || feedback.length === 0) return;

  const winCount = feedback.filter((f: any) => f.result === 'WIN').length;
  const lossCount = feedback.filter((f: any) => f.result === 'LOSS').length;
  const totalTrades = feedback.length;
  const successRate = (winCount / totalTrades) * 100;
  const reputationScore = 50 + (successRate - 50) * 1.5;

  await supabase.from('crypto_reputation').upsert({
    symbol: 'BTCUSDT',
    win_count: winCount,
    loss_count: lossCount,
    total_trades: totalTrades,
    success_rate: successRate,
    reputation_score: Math.max(0, Math.min(100, reputationScore))
  });

  console.log(`[evaluate-trades-v2] Reputation updated: ${successRate.toFixed(2)}% win rate`);
}