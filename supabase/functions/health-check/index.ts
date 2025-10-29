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

    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {}
    };

    // Database
    try {
      const { error } = await supabase.from('crypto_signals').select('id').limit(1);
      health.components.database = error ? { status: 'unhealthy', error: error.message } : { status: 'healthy' };
    } catch (e) {
      health.components.database = { status: 'unhealthy', error: e.message };
    }

    // Functions
    try {
      const { data: logs, error } = await supabase
        .from('function_logs')
        .select('function_name, success')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) throw error;

      const total = logs?.length || 0;
      const successful = logs?.filter(l => l.success).length || 0;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      health.components.functions = {
        status: successRate >= 80 ? 'healthy' : successRate >= 50 ? 'degraded' : 'unhealthy',
        total_calls_5min: total,
        success_rate: Math.round(successRate * 100) / 100
      };
    } catch (e) {
      health.components.functions = { status: 'unknown', error: e.message };
    }

    // Signals
    try {
      const { data: signals, error } = await supabase
        .from('crypto_signals')
        .select('signal_type, status')
        .eq('symbol', 'BTCUSDT')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const count = signals?.length || 0;
      const active = signals?.filter(s => s.status === 'active').length || 0;

      health.components.signals = {
        status: count > 0 ? 'healthy' : 'warning',
        generated_24h: count,
        active: active
      };
    } catch (e) {
      health.components.signals = { status: 'unknown', error: e.message };
    }

    // Cache
    try {
      const { data: cache, error } = await supabase
        .from('api_cache')
        .select('api_name, fetched_at')
        .eq('api_name', 'scan_market_btc')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const age = cache ? Date.now() - new Date(cache.fetched_at).getTime() : Infinity;
      const ageMinutes = Math.floor(age / 60000);

      health.components.cache = {
        status: ageMinutes < 15 ? 'healthy' : ageMinutes < 60 ? 'warning' : 'stale',
        age_minutes: ageMinutes,
        last_update: cache?.fetched_at
      };
    } catch (e) {
      health.components.cache = { status: 'unknown', error: e.message };
    }

    // Binance
    try {
      const response = await fetch('https://api.binance.com/api/v3/ping', { signal: AbortSignal.timeout(5000) });
      health.components.binance = { status: response.ok ? 'healthy' : 'unhealthy' };
    } catch (e) {
      health.components.binance = { status: 'unhealthy', error: 'unreachable' };
    }

    // CoinGecko
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/ping', { signal: AbortSignal.timeout(5000) });
      health.components.coingecko = { status: response.ok ? 'healthy' : 'unhealthy' };
    } catch (e) {
      health.components.coingecko = { status: 'unhealthy', error: 'unreachable' };
    }

    // Claude
    health.components.claude = {
      status: Deno.env.get('CLAUDE_API_KEY') ? 'configured' : 'missing'
    };

    const componentStatuses = Object.values(health.components).map((c: any) => c.status);
    const hasUnhealthy = componentStatuses.includes('unhealthy');
    const hasDegraded = componentStatuses.includes('degraded') || componentStatuses.includes('warning');

    health.status = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

    return new Response(
      JSON.stringify(health, null, 2),
      {
        status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 207 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[health-check] Error:', error);
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
