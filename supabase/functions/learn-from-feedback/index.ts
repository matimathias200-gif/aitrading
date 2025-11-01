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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: feedback, error: feedbackError } = await supabase
      .from('signal_feedback')
      .select(`
        id,
        signal_id,
        feedback_type,
        profit_loss,
        created_at,
        crypto_signals (
          symbol,
          signal_type,
          confidence,
          entry_price,
          take_profit,
          stop_loss
        )
      `)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    if (feedbackError) throw feedbackError;

    if (!feedback || feedback.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No feedback data available for analysis',
          recommendations: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = {
      total_feedback: feedback.length,
      successful: feedback.filter(f => f.feedback_type === 'success').length,
      failed: feedback.filter(f => f.feedback_type === 'failed').length,
      total_profit_loss: feedback.reduce((sum, f) => sum + (f.profit_loss || 0), 0),
      by_symbol: {} as Record<string, any>,
      by_signal_type: {} as Record<string, any>
    };

    feedback.forEach(f => {
      const symbol = f.crypto_signals?.symbol || 'unknown';
      if (!stats.by_symbol[symbol]) {
        stats.by_symbol[symbol] = { count: 0, wins: 0, losses: 0, total_pl: 0 };
      }
      stats.by_symbol[symbol].count++;
      if (f.feedback_type === 'success') stats.by_symbol[symbol].wins++;
      if (f.feedback_type === 'failed') stats.by_symbol[symbol].losses++;
      stats.by_symbol[symbol].total_pl += f.profit_loss || 0;
    });

    feedback.forEach(f => {
      const signalType = f.crypto_signals?.signal_type || 'unknown';
      if (!stats.by_signal_type[signalType]) {
        stats.by_signal_type[signalType] = { count: 0, wins: 0, losses: 0, total_pl: 0 };
      }
      stats.by_signal_type[signalType].count++;
      if (f.feedback_type === 'success') stats.by_signal_type[signalType].wins++;
      if (f.feedback_type === 'failed') stats.by_signal_type[signalType].losses++;
      stats.by_signal_type[signalType].total_pl += f.profit_loss || 0;
    });

    const winRate = stats.total_feedback > 0 ? (stats.successful / stats.total_feedback * 100).toFixed(1) : 0;

    const prompt = `Tu es un expert en trading algorithmique. Analyse les performances suivantes et donne des recommandations d'amélioration.

STATISTIQUES DES 30 DERNIERS JOURS:
- Nombre total de signaux: ${stats.total_feedback}
- Signaux réussis: ${stats.successful}
- Signaux échoués: ${stats.failed}
- Taux de réussite: ${winRate}%
- Profit/Perte total: $${stats.total_profit_loss.toFixed(2)}

PERFORMANCES PAR CRYPTO:
${Object.entries(stats.by_symbol).map(([symbol, data]: [string, any]) => 
  `- ${symbol}: ${data.count} signaux, ${data.wins} wins, ${data.losses} losses, P/L: $${data.total_pl.toFixed(2)}`
).join('\n')}

PERFORMANCES PAR TYPE DE SIGNAL:
${Object.entries(stats.by_signal_type).map(([type, data]: [string, any]) => 
  `- ${type}: ${data.count} signaux, ${data.wins} wins, ${data.losses} losses, P/L: $${data.total_pl.toFixed(2)}`
).join('\n')}

Réponds en JSON (sans markdown):
{
  "overall_assessment": "analyse générale des performances",
  "recommendations": [
    "recommandation 1",
    "recommandation 2",
    "recommandation 3"
  ],
  "strategy_adjustments": {
    "rsi_threshold": "ajustement proposé si nécessaire",
    "confidence_minimum": "seuil de confiance minimum recommandé",
    "symbols_to_avoid": ["liste des symboles à éviter si applicable"],
    "symbols_to_favor": ["liste des symboles à favoriser"]
  },
  "risk_management": {
    "stop_loss_suggestion": "pourcentage recommandé",
    "take_profit_suggestion": "pourcentage recommandé"
  }
}`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const aiResponseText = claudeData.content[0].text;

    let analysis;
    try {
      const cleanedText = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', aiResponseText);
      throw new Error(`Invalid JSON response from Claude AI: ${parseError.message}`);
    }

    const { error: insertError } = await supabase
      .from('ai_learning_logs')
      .insert({
        analysis_data: {
          stats,
          ai_analysis: analysis,
          timestamp: new Date().toISOString()
        },
        recommendations: analysis.recommendations,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing learning log:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        analysis,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in learn-from-feedback:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});