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

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) throw new Error('CLAUDE_API_KEY not configured');

    console.log('[generate-eth-signal] Starting...');

    const { data: scanData } = await supabase
      .from('api_cache')
      .select('response_data')
      .eq('api_name', 'scan_market_eth')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scanData) throw new Error('No market data for ETH');

    const market = scanData.response_data.market;
    const news = scanData.response_data.news || { headlines: [], sentiment: 'neutral' };

    const rsi = market.change24h > 0 ? 60 + Math.min(market.change24h * 5, 20) : 40 + Math.max(market.change24h * 5, -20);

    const { data: rep } = await supabase
      .from('reputation')
      .select('reputation_score')
      .eq('symbol', 'ETHUSDT')
      .maybeSingle();

    const reputation = rep?.reputation_score || 50;

    const prompt = `Analyse ETHUSDT. Prix: $${market.price}, Var 24h: ${market.change24h}%, RSI: ${rsi.toFixed(2)}, News: ${news.sentiment}, Rep: ${reputation}/100. Retourne JSON (sans markdown): {\"symbol\":\"ETHUSDT\",\"signal_type\":\"BUY\"ou\"SELL\"ou\"WAIT\",\"confidence\":0-100,\"entry_price\":${market.price},\"take_profit\":<number>,\"stop_loss\":<number>,\"horizon_minutes\":240,\"position_size_pct\":5,\"reason\":{\"explain\":\"<txt>\",\"indicators\":[\"RSI\",\"prix\"]}}`;

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeResp.ok) {
      const err = await claudeResp.text();
      throw new Error(`Claude: ${claudeResp.status}`);
    }

    const claudeData = await claudeResp.json();
    const content = claudeData.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const signal = JSON.parse(jsonMatch[0]);

    let saved = null;

    if (signal.signal_type === 'BUY' || signal.signal_type === 'SELL') {
      const { data: savedData, error: saveError } = await supabase
        .from('crypto_signals')
        .insert({
          symbol: 'ETHUSDT',
          signal_type: signal.signal_type,
          confidence: signal.confidence,
          entry_price: signal.entry_price,
          take_profit: signal.take_profit,
          stop_loss: signal.stop_loss,
          horizon_minutes: signal.horizon_minutes || 240,
          reason: {
            explain: signal.reason?.explain || '',
            indicators: signal.reason?.indicators || ['RSI']
          },
          status: 'active'
        })
        .select()
        .single();

      if (saveError) {
        console.error('[generate-eth-signal] Save error:', saveError);
        throw saveError;
      }

      saved = savedData;
    } else {
      console.log('[generate-eth-signal] WAIT signal, not saving to DB');
    }

    await supabase.from('function_logs').insert({
      function_name: 'generate-eth-signal',
      success: true,
      model_name: 'claude-3-haiku-20240307',
      signal_type: signal.signal_type,
      confidence: signal.confidence,
      latency_ms: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({ success: true, signal: saved, latency_ms: Date.now() - startTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-eth-signal] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});