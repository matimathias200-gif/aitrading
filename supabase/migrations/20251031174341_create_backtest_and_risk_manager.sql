/*
  # Backtest + Risk Manager - Système Auto-Apprenant
  
  1. Table backtest_results
    - Stocke les résultats de backtesting sur 30 jours
    - Analyse win rate, profit moyen, patterns gagnants
  
  2. Table risk_manager
    - Adaptation automatique du risque selon performance
    - Ajustement allocation et levier dynamique
  
  3. Fonctions helper
    - calculate_backtest_metrics()
    - update_risk_allocation()
*/

-- =====================================================
-- 1. TABLE BACKTEST_RESULTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.backtest_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL DEFAULT 'BTCUSDT',
  tested_days integer NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  
  -- Statistiques globales
  signals_tested integer NOT NULL,
  signals_win integer DEFAULT 0,
  signals_loss integer DEFAULT 0,
  signals_neutral integer DEFAULT 0,
  
  -- Métriques de performance
  winrate numeric DEFAULT 0,
  avg_profit numeric DEFAULT 0,
  avg_loss numeric DEFAULT 0,
  total_pnl numeric DEFAULT 0,
  max_drawdown numeric DEFAULT 0,
  sharpe_ratio numeric DEFAULT 0,
  
  -- Patterns analysis
  best_pattern text,
  best_pattern_winrate numeric,
  worst_pattern text,
  worst_pattern_winrate numeric,
  
  -- Métadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backtest_symbol ON public.backtest_results(symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_created_at ON public.backtest_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_winrate ON public.backtest_results(winrate DESC);

ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view backtest results" ON public.backtest_results FOR SELECT USING (true);

COMMENT ON TABLE public.backtest_results IS 'Résultats de backtesting automatique sur 30 jours';

-- =====================================================
-- 2. TABLE RISK_MANAGER
-- =====================================================

CREATE TABLE IF NOT EXISTS public.risk_manager (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  
  -- Win rate analysis
  recent_winrate numeric DEFAULT 50.0,
  trades_count integer DEFAULT 0,
  
  -- Allocation parameters
  base_allocation numeric DEFAULT 1.0,
  adjusted_allocation numeric DEFAULT 1.0,
  leverage numeric DEFAULT 1.0,
  
  -- Risk status
  risk_status text DEFAULT 'normal', -- 'conservative', 'normal', 'aggressive', 'suspended'
  confidence_level text DEFAULT 'medium', -- 'low', 'medium', 'high'
  
  -- Adjustment rules
  last_adjustment_reason text,
  adjustment_history jsonb DEFAULT '[]'::jsonb,
  
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_manager_symbol ON public.risk_manager(symbol);
CREATE INDEX IF NOT EXISTS idx_risk_manager_status ON public.risk_manager(risk_status);

ALTER TABLE public.risk_manager ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view risk manager" ON public.risk_manager FOR SELECT USING (true);

COMMENT ON TABLE public.risk_manager IS 'Gestion automatique du risque selon performance';

-- =====================================================
-- 3. TABLE BACKTEST_SIGNALS (détail de chaque signal testé)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.backtest_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_id uuid REFERENCES public.backtest_results(id) ON DELETE CASCADE,
  
  symbol text NOT NULL,
  signal_type text NOT NULL, -- 'BUY', 'SELL', 'WAIT'
  
  -- Prix et timing
  entry_price numeric NOT NULL,
  exit_price numeric,
  take_profit numeric,
  stop_loss numeric,
  entry_timestamp timestamptz NOT NULL,
  exit_timestamp timestamptz,
  
  -- Indicateurs au moment du signal
  rsi numeric,
  macd numeric,
  ema20 numeric,
  ema50 numeric,
  volume_ratio numeric,
  
  -- Résultat
  result text, -- 'WIN', 'LOSS', 'NEUTRAL'
  pnl_percent numeric,
  confidence numeric,
  
  pattern_name text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backtest_signals_backtest_id ON public.backtest_signals(backtest_id);
CREATE INDEX IF NOT EXISTS idx_backtest_signals_result ON public.backtest_signals(result);
CREATE INDEX IF NOT EXISTS idx_backtest_signals_pattern ON public.backtest_signals(pattern_name);

ALTER TABLE public.backtest_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view backtest signals" ON public.backtest_signals FOR SELECT USING (true);

COMMENT ON TABLE public.backtest_signals IS 'Détail de chaque signal testé lors du backtest';

-- =====================================================
-- 4. FONCTION - Calculer métriques de backtest
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_backtest_metrics(p_backtest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_signals_tested integer;
  v_signals_win integer;
  v_signals_loss integer;
  v_winrate numeric;
  v_avg_profit numeric;
  v_avg_loss numeric;
  v_best_pattern record;
  v_worst_pattern record;
BEGIN
  -- Compter les signaux
  SELECT
    COUNT(*),
    SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END),
    SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END)
  INTO v_signals_tested, v_signals_win, v_signals_loss
  FROM backtest_signals
  WHERE backtest_id = p_backtest_id;
  
  -- Calculer win rate
  v_winrate := CASE WHEN v_signals_tested > 0 
    THEN ROUND(100.0 * v_signals_win / v_signals_tested, 2) 
    ELSE 0 END;
  
  -- Profit/Loss moyens
  SELECT
    AVG(CASE WHEN result = 'WIN' THEN pnl_percent ELSE NULL END),
    AVG(CASE WHEN result = 'LOSS' THEN pnl_percent ELSE NULL END)
  INTO v_avg_profit, v_avg_loss
  FROM backtest_signals
  WHERE backtest_id = p_backtest_id;
  
  -- Meilleur pattern
  SELECT pattern_name, ROUND(100.0 * SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) / COUNT(*), 2) as wr
  INTO v_best_pattern
  FROM backtest_signals
  WHERE backtest_id = p_backtest_id AND pattern_name IS NOT NULL
  GROUP BY pattern_name
  HAVING COUNT(*) >= 3
  ORDER BY wr DESC
  LIMIT 1;
  
  -- Pire pattern
  SELECT pattern_name, ROUND(100.0 * SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) / COUNT(*), 2) as wr
  INTO v_worst_pattern
  FROM backtest_signals
  WHERE backtest_id = p_backtest_id AND pattern_name IS NOT NULL
  GROUP BY pattern_name
  HAVING COUNT(*) >= 3
  ORDER BY wr ASC
  LIMIT 1;
  
  -- Construire résultat
  v_result := jsonb_build_object(
    'signals_tested', v_signals_tested,
    'signals_win', v_signals_win,
    'signals_loss', v_signals_loss,
    'winrate', v_winrate,
    'avg_profit', ROUND(COALESCE(v_avg_profit, 0), 2),
    'avg_loss', ROUND(COALESCE(v_avg_loss, 0), 2),
    'best_pattern', v_best_pattern.pattern_name,
    'best_pattern_winrate', v_best_pattern.wr,
    'worst_pattern', v_worst_pattern.pattern_name,
    'worst_pattern_winrate', v_worst_pattern.wr
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 5. FONCTION - Mettre à jour l'allocation de risque
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_risk_allocation(
  p_symbol text,
  p_recent_winrate numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base_allocation numeric := 1.0;
  v_adjusted_allocation numeric;
  v_risk_status text;
  v_confidence_level text;
  v_adjustment_reason text;
BEGIN
  -- Calculer l'allocation ajustée
  IF p_recent_winrate > 75 THEN
    v_adjusted_allocation := v_base_allocation * 1.2;
    v_risk_status := 'aggressive';
    v_confidence_level := 'high';
    v_adjustment_reason := 'Win rate élevé (>75%), allocation augmentée de 20%';
  ELSIF p_recent_winrate >= 60 THEN
    v_adjusted_allocation := v_base_allocation * 1.0;
    v_risk_status := 'normal';
    v_confidence_level := 'medium';
    v_adjustment_reason := 'Win rate normal (60-75%), allocation maintenue';
  ELSIF p_recent_winrate >= 50 THEN
    v_adjusted_allocation := v_base_allocation * 0.8;
    v_risk_status := 'conservative';
    v_confidence_level := 'low';
    v_adjustment_reason := 'Win rate faible (50-60%), allocation réduite de 20%';
  ELSE
    v_adjusted_allocation := v_base_allocation * 0.5;
    v_risk_status := 'suspended';
    v_confidence_level := 'low';
    v_adjustment_reason := 'Win rate critique (<50%), allocation réduite de 50%';
  END IF;
  
  -- Mettre à jour ou insérer
  INSERT INTO risk_manager (
    symbol,
    recent_winrate,
    base_allocation,
    adjusted_allocation,
    risk_status,
    confidence_level,
    last_adjustment_reason,
    last_updated
  ) VALUES (
    p_symbol,
    p_recent_winrate,
    v_base_allocation,
    v_adjusted_allocation,
    v_risk_status,
    v_confidence_level,
    v_adjustment_reason,
    NOW()
  )
  ON CONFLICT (symbol)
  DO UPDATE SET
    recent_winrate = p_recent_winrate,
    adjusted_allocation = v_adjusted_allocation,
    risk_status = v_risk_status,
    confidence_level = v_confidence_level,
    last_adjustment_reason = v_adjustment_reason,
    adjustment_history = risk_manager.adjustment_history || jsonb_build_object(
      'timestamp', NOW(),
      'winrate', p_recent_winrate,
      'allocation', v_adjusted_allocation,
      'reason', v_adjustment_reason
    ),
    last_updated = NOW();
  
  RETURN jsonb_build_object(
    'symbol', p_symbol,
    'recent_winrate', p_recent_winrate,
    'adjusted_allocation', v_adjusted_allocation,
    'risk_status', v_risk_status,
    'comment', v_adjustment_reason
  );
END;
$$;

-- =====================================================
-- 6. VUE - Derniers résultats de backtest
-- =====================================================

CREATE OR REPLACE VIEW public.latest_backtest_results AS
SELECT
  symbol,
  tested_days,
  signals_tested,
  winrate,
  avg_profit,
  avg_loss,
  best_pattern,
  best_pattern_winrate,
  created_at
FROM backtest_results
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

COMMENT ON VIEW public.latest_backtest_results IS 'Derniers résultats de backtest (7 jours)';
