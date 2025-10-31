import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * UPDATE-RISK-PARAMETERS - Adaptation automatique du risque
 * Ajuste allocation et levier selon win rate
 * S'exécute après chaque backtest ou toutes les 6h
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

    console.log('[update-risk] Updating risk parameters...');

    // STEP 1: Récupérer le dernier backtest
    const { data: latestBacktest } = await supabase
      .from('backtest_results')
      .select('winrate, signals_tested')
      .eq('symbol', 'BTCUSDT')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // STEP 2: Récupérer win rate from trade_feedback (derniers 30 trades)
    const { data: recentTrades } = await supabase
      .from('trade_feedback')
      .select('result')
      .eq('symbol', 'BTCUSDT')
      .order('created_at', { ascending: false })
      .limit(30);

    let winrate = 50; // Default
    let tradesCount = 0;
    let dataSource = 'default';

    // Priorité 1: Backtest récent (< 3 jours)
    if (latestBacktest && latestBacktest.signals_tested >= 20) {
      winrate = latestBacktest.winrate;
      tradesCount = latestBacktest.signals_tested;
      dataSource = 'backtest';
      console.log(`[update-risk] Using backtest win rate: ${winrate}%`);
    }
    // Priorité 2: Trade feedback réel
    else if (recentTrades && recentTrades.length >= 10) {
      const wins = recentTrades.filter((t: any) => t.result === 'WIN').length;
      winrate = (wins / recentTrades.length) * 100;
      tradesCount = recentTrades.length;
      dataSource = 'live_trades';
      console.log(`[update-risk] Using live trades win rate: ${winrate}%`);
    }

    // STEP 3: Appeler la fonction SQL update_risk_allocation
    const { data: riskData, error: riskError } = await supabase
      .rpc('update_risk_allocation', {
        p_symbol: 'BTCUSDT',
        p_recent_winrate: winrate
      });

    if (riskError) {
      throw new Error(`Failed to update risk allocation: ${riskError.message}`);
    }

    console.log('[update-risk] Risk parameters updated:', riskData);

    // STEP 4: Récupérer l'état actuel du risk manager
    const { data: riskManager } = await supabase
      .from('risk_manager')
      .select('*')
      .eq('symbol', 'BTCUSDT')
      .maybeSingle();

    // STEP 5: Générer recommandations
    const recommendations = generateRecommendations(riskManager);

    // STEP 6: Log dans system_audit_log
    await supabase.from('system_audit_log').insert({
      audit_type: 'performance',
      component: 'risk_manager',
      status: riskManager?.risk_status || 'normal',
      message: `Risk parameters updated: ${riskManager?.recent_winrate.toFixed(1)}% win rate`,
      metrics: {
        winrate,
        adjusted_allocation: riskManager?.adjusted_allocation,
        risk_status: riskManager?.risk_status,
        data_source: dataSource,
        trades_count: tradesCount
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        symbol: 'BTCUSDT',
        recent_winrate: riskManager?.recent_winrate || winrate,
        base_allocation: riskManager?.base_allocation || 1.0,
        adjusted_allocation: riskManager?.adjusted_allocation || 1.0,
        leverage: riskManager?.leverage || 1.0,
        risk_status: riskManager?.risk_status || 'normal',
        confidence_level: riskManager?.confidence_level || 'medium',
        last_adjustment_reason: riskManager?.last_adjustment_reason,
        recommendations,
        data_source: dataSource,
        trades_analyzed: tradesCount
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[update-risk] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Générer recommandations basées sur le risk manager
 */
function generateRecommendations(riskManager: any): string[] {
  if (!riskManager) {
    return ['Aucune donnée de risque disponible'];
  }

  const recommendations: string[] = [];
  const winrate = riskManager.recent_winrate;
  const status = riskManager.risk_status;

  if (status === 'aggressive') {
    recommendations.push('✅ Performance excellente: maintenir la stratégie actuelle');
    recommendations.push('💡 Envisager d\'augmenter légèrement la taille de position');
    recommendations.push('📊 Surveiller les signaux pour éviter le sur-trading');
  } else if (status === 'normal') {
    recommendations.push('✅ Performance stable: continuer avec la stratégie actuelle');
    recommendations.push('📊 Monitorer les patterns gagnants pour optimisation');
  } else if (status === 'conservative') {
    recommendations.push('⚠️ Performance en baisse: réduire la taille de position');
    recommendations.push('🔍 Analyser les patterns perdants pour ajustement');
    recommendations.push('📉 Envisager d\'attendre des signaux à haute confiance (>75%)');
  } else if (status === 'suspended') {
    recommendations.push('❌ Performance critique: suspendre le trading automatique');
    recommendations.push('🔍 Réviser complètement la stratégie et les indicateurs');
    recommendations.push('📊 Lancer un nouveau backtest pour validation');
    recommendations.push('⏸️ Ne reprendre le trading qu\'après win rate > 55%');
  }

  // Recommandations spécifiques selon win rate
  if (winrate > 80) {
    recommendations.push('🚀 Win rate exceptionnel: vérifier si surajustement (overfitting)');
  } else if (winrate < 45) {
    recommendations.push('⚠️ Win rate faible: possible problème de stratégie ou conditions de marché');
  }

  return recommendations;
}
