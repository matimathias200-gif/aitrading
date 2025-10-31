import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * SYSTEM-AUDIT - Surveillance automatique
 * Vérifie l'état de toutes les fonctions et APIs
 * S'exécute toutes les 6h via cron
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

    console.log('[system-audit] Starting system audit...');

    const audit: any = {
      timestamp: new Date().toISOString(),
      overall_status: 'healthy',
      components: {},
      apis: {},
      patterns: {},
      alerts: []
    };

    // ===================================================
    // 1. CHECK EDGE FUNCTIONS (dernières 24h)
    // ===================================================

    const { data: functionLogs } = await supabase
      .from('function_logs')
      .select('function_name, success, latency_ms')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (functionLogs && functionLogs.length > 0) {
      const funcs = ['scan-market', 'generate-btc-signal', 'evaluate-trades'];

      for (const funcName of funcs) {
        const logs = functionLogs.filter((l: any) => l.function_name.includes(funcName));
        const total = logs.length;
        const successful = logs.filter((l: any) => l.success).length;
        const avgLatency = total > 0 ? logs.reduce((sum: number, l: any) => sum + (l.latency_ms || 0), 0) / total : 0;
        const successRate = total > 0 ? (successful / total) * 100 : 0;

        const status = successRate >= 80 ? 'healthy' : successRate >= 50 ? 'degraded' : 'unhealthy';

        audit.components[funcName] = {
          status,
          calls_24h: total,
          success_rate: Math.round(successRate * 100) / 100,
          avg_latency_ms: Math.round(avgLatency)
        };

        if (status !== 'healthy') {
          audit.alerts.push(`${funcName}: ${status} (${successRate.toFixed(1)}% success rate)`);
        }
      }
    }

    // ===================================================
    // 2. CHECK APIS (dernières 6h)
    // ===================================================

    const { data: apiLogs } = await supabase
      .from('api_logs')
      .select('api_name, status, response_time_ms, created_at')
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());

    if (apiLogs && apiLogs.length > 0) {
      const apis = ['CoinGecko', 'CoinMarketCap', 'CryptoPanic', 'Claude-Haiku', 'Claude-Sonnet'];

      for (const apiName of apis) {
        const logs = apiLogs.filter((l: any) => l.api_name === apiName);
        const total = logs.length;
        const successful = logs.filter((l: any) => l.status === 'OK').length;
        const successRate = total > 0 ? (successful / total) * 100 : 0;
        const lastCall = total > 0 ? logs[logs.length - 1].created_at : null;
        const timeSinceLast = lastCall ? Date.now() - new Date(lastCall).getTime() : Infinity;

        const status = successRate >= 80 && timeSinceLast < 3600000 ? 'healthy' :
                       successRate >= 50 ? 'degraded' : 'unhealthy';

        audit.apis[apiName] = {
          status,
          calls_6h: total,
          success_rate: Math.round(successRate * 100) / 100,
          last_call: lastCall,
          minutes_since_last: Math.floor(timeSinceLast / 60000)
        };

        if (status !== 'healthy') {
          audit.alerts.push(`API ${apiName}: ${status}`);
        }
      }
    }

    // ===================================================
    // 3. CHECK SIGNALS (dernières 24h)
    // ===================================================

    const { data: signals } = await supabase
      .from('crypto_signals')
      .select('signal_type, status, confidence')
      .eq('symbol', 'BTCUSDT')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (signals && signals.length > 0) {
      const buySignals = signals.filter((s: any) => s.signal_type === 'BUY').length;
      const sellSignals = signals.filter((s: any) => s.signal_type === 'SELL').length;
      const waitSignals = signals.filter((s: any) => s.signal_type === 'WAIT').length;
      const avgConfidence = signals.reduce((sum: number, s: any) => sum + s.confidence, 0) / signals.length;

      audit.components.signals = {
        status: 'healthy',
        generated_24h: signals.length,
        buy: buySignals,
        sell: sellSignals,
        wait: waitSignals,
        avg_confidence: Math.round(avgConfidence * 100) / 100
      };

      if (signals.length === 0) {
        audit.alerts.push('No signals generated in last 24h');
      }
    }

    // ===================================================
    // 4. CHECK PATTERNS
    // ===================================================

    const { data: patterns } = await supabase
      .from('signal_patterns')
      .select('pattern_name, total_occurrences, win_rate, confidence_boost')
      .gte('total_occurrences', 5)
      .order('win_rate', { ascending: false })
      .limit(5);

    if (patterns && patterns.length > 0) {
      audit.patterns.top_performers = patterns.map((p: any) => ({
        pattern: p.pattern_name,
        occurrences: p.total_occurrences,
        win_rate: p.win_rate,
        boost: p.confidence_boost
      }));
    }

    // ===================================================
    // 5. CHECK REPUTATION
    // ===================================================

    const { data: reputation } = await supabase
      .from('crypto_reputation')
      .select('*')
      .eq('symbol', 'BTCUSDT')
      .maybeSingle();

    if (reputation) {
      audit.components.reputation = {
        status: reputation.success_rate >= 55 ? 'healthy' : 'needs_improvement',
        win_rate: reputation.success_rate,
        total_trades: reputation.total_trades,
        reputation_score: reputation.reputation_score
      };

      if (reputation.success_rate < 50) {
        audit.alerts.push(`Low win rate: ${reputation.success_rate.toFixed(1)}%`);
      }
    }

    // ===================================================
    // 6. DETERMINE OVERALL STATUS
    // ===================================================

    const componentStatuses = Object.values(audit.components).map((c: any) => c.status);
    const apiStatuses = Object.values(audit.apis).map((a: any) => a.status);
    const allStatuses = [...componentStatuses, ...apiStatuses];

    const hasUnhealthy = allStatuses.includes('unhealthy');
    const hasDegraded = allStatuses.includes('degraded');

    audit.overall_status = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
    audit.alert_count = audit.alerts.length;

    // ===================================================
    // 7. SAVE AUDIT LOG
    // ===================================================

    await supabase.from('system_audit_log').insert({
      audit_type: 'health_check',
      component: 'system',
      status: audit.overall_status,
      message: `System audit complete: ${audit.alert_count} alerts`,
      metrics: audit
    });

    console.log(`[system-audit] Audit complete: ${audit.overall_status} (${audit.alert_count} alerts)`);

    // ===================================================
    // 8. GENERATE SUMMARY MESSAGE
    // ===================================================

    const summary = generateSummary(audit);

    return new Response(
      JSON.stringify({
        success: true,
        audit,
        summary
      }, null, 2),
      {
        status: audit.overall_status === 'healthy' ? 200 : 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[system-audit] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate human-readable summary
 */
function generateSummary(audit: any): string {
  const emoji = audit.overall_status === 'healthy' ? '✅' :
                audit.overall_status === 'degraded' ? '⚠️' : '❌';

  let summary = `${emoji} Système ${audit.overall_status.toUpperCase()}\n\n`;

  // Functions
  const funcCount = Object.keys(audit.components).length;
  const funcHealthy = Object.values(audit.components).filter((c: any) => c.status === 'healthy').length;
  summary += `Fonctions: ${funcHealthy}/${funcCount} actives\n`;

  // APIs
  const apiCount = Object.keys(audit.apis).length;
  const apiHealthy = Object.values(audit.apis).filter((a: any) => a.status === 'healthy').length;
  summary += `APIs: ${apiHealthy}/${apiCount} OK\n`;

  // Signals
  if (audit.components.signals) {
    summary += `Signaux 24h: ${audit.components.signals.generated_24h} (${audit.components.signals.avg_confidence.toFixed(0)}% confiance)\n`;
  }

  // Reputation
  if (audit.components.reputation) {
    summary += `Win Rate: ${audit.components.reputation.win_rate.toFixed(1)}%\n`;
  }

  // Alerts
  if (audit.alerts.length > 0) {
    summary += `\n⚠️ Alertes (${audit.alerts.length}):\n`;
    audit.alerts.forEach((alert: string) => {
      summary += `  - ${alert}\n`;
    });
  }

  return summary;
}
