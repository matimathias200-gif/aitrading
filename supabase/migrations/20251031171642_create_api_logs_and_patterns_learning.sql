/*
  # Système Vivant - API Logs + Pattern Learning
  
  1. Table api_logs
    - Tracking détaillé de chaque appel API
    - Status, latence, nombre de rows reçues
  
  2. Table signal_patterns
    - Apprentissage automatique des patterns WIN/LOSS
    - Ajustement automatique de la confiance
  
  3. Table system_audit_log
    - Surveillance automatique du système
    - Alertes et métriques
*/

-- =====================================================
-- 1. TABLE API_LOGS - Tracking détaillé des APIs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL,
  endpoint text,
  status text NOT NULL, -- 'OK', 'ERROR', 'TIMEOUT'
  status_code integer,
  rows_received integer DEFAULT 0,
  response_time_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_api_name ON public.api_logs(api_name);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON public.api_logs(status);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view api logs" ON public.api_logs FOR SELECT USING (true);

COMMENT ON TABLE public.api_logs IS 'Tracking détaillé de tous les appels API externes';

-- =====================================================
-- 2. TABLE SIGNAL_PATTERNS - Apprentissage automatique
-- =====================================================

CREATE TABLE IF NOT EXISTS public.signal_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name text NOT NULL UNIQUE,
  pattern_conditions jsonb NOT NULL,
  total_occurrences integer DEFAULT 0,
  win_count integer DEFAULT 0,
  loss_count integer DEFAULT 0,
  neutral_count integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  avg_pnl_percent numeric DEFAULT 0,
  confidence_boost numeric DEFAULT 0, -- Ajustement auto de confiance
  last_seen_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_patterns_win_rate ON public.signal_patterns(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_signal_patterns_name ON public.signal_patterns(pattern_name);

ALTER TABLE public.signal_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view signal patterns" ON public.signal_patterns FOR SELECT USING (true);

COMMENT ON TABLE public.signal_patterns IS 'Patterns de signaux avec apprentissage automatique du win rate';

-- =====================================================
-- 3. TABLE SYSTEM_AUDIT_LOG - Surveillance système
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type text NOT NULL, -- 'health_check', 'performance', 'error', 'warning'
  component text NOT NULL, -- 'scan-market', 'generate-signal', 'evaluate-trades'
  status text NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
  message text,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_audit_component ON public.system_audit_log(component);
CREATE INDEX IF NOT EXISTS idx_system_audit_created_at ON public.system_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_status ON public.system_audit_log(status);

ALTER TABLE public.system_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view system audit" ON public.system_audit_log FOR SELECT USING (true);

COMMENT ON TABLE public.system_audit_log IS 'Log de surveillance automatique du système';

-- =====================================================
-- 4. FONCTION - Enregistrer un appel API
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_api_call(
  p_api_name text,
  p_endpoint text,
  p_status text,
  p_status_code integer DEFAULT NULL,
  p_rows_received integer DEFAULT 0,
  p_response_time_ms integer DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO api_logs (
    api_name,
    endpoint,
    status,
    status_code,
    rows_received,
    response_time_ms,
    error_message,
    metadata
  ) VALUES (
    p_api_name,
    p_endpoint,
    p_status,
    p_status_code,
    p_rows_received,
    p_response_time_ms,
    p_error_message,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- =====================================================
-- 5. FONCTION - Mettre à jour un pattern
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_signal_pattern(
  p_pattern_name text,
  p_pattern_conditions jsonb,
  p_result text, -- 'WIN', 'LOSS', 'NEUTRAL'
  p_pnl_percent numeric
) RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO signal_patterns (
    pattern_name,
    pattern_conditions,
    total_occurrences,
    win_count,
    loss_count,
    neutral_count,
    win_rate,
    avg_pnl_percent,
    confidence_boost,
    last_seen_at
  ) VALUES (
    p_pattern_name,
    p_pattern_conditions,
    1,
    CASE WHEN p_result = 'WIN' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'LOSS' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'NEUTRAL' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'WIN' THEN 100.0 ELSE 0.0 END,
    p_pnl_percent,
    CASE WHEN p_result = 'WIN' THEN 5.0 ELSE -5.0 END,
    now()
  )
  ON CONFLICT (pattern_name)
  DO UPDATE SET
    total_occurrences = signal_patterns.total_occurrences + 1,
    win_count = signal_patterns.win_count + CASE WHEN p_result = 'WIN' THEN 1 ELSE 0 END,
    loss_count = signal_patterns.loss_count + CASE WHEN p_result = 'LOSS' THEN 1 ELSE 0 END,
    neutral_count = signal_patterns.neutral_count + CASE WHEN p_result = 'NEUTRAL' THEN 1 ELSE 0 END,
    win_rate = ROUND(100.0 * (signal_patterns.win_count + CASE WHEN p_result = 'WIN' THEN 1 ELSE 0 END) / 
                (signal_patterns.total_occurrences + 1), 2),
    avg_pnl_percent = ROUND((signal_patterns.avg_pnl_percent * signal_patterns.total_occurrences + p_pnl_percent) / 
                      (signal_patterns.total_occurrences + 1), 2),
    confidence_boost = CASE 
      WHEN ROUND(100.0 * (signal_patterns.win_count + CASE WHEN p_result = 'WIN' THEN 1 ELSE 0 END) / 
           (signal_patterns.total_occurrences + 1), 2) > 60 THEN 10.0
      WHEN ROUND(100.0 * (signal_patterns.win_count + CASE WHEN p_result = 'WIN' THEN 1 ELSE 0 END) / 
           (signal_patterns.total_occurrences + 1), 2) > 50 THEN 5.0
      ELSE -5.0
    END,
    last_seen_at = now(),
    updated_at = now();
END;
$$;

-- =====================================================
-- 6. VUE - Dashboard API Health
-- =====================================================

CREATE OR REPLACE VIEW public.api_health_dashboard AS
SELECT
  api_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN status = 'OK' THEN 1 ELSE 0 END) as successful_calls,
  ROUND(100.0 * SUM(CASE WHEN status = 'OK' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ROUND(AVG(response_time_ms), 0) as avg_response_ms,
  MAX(created_at) as last_call,
  AGE(NOW(), MAX(created_at)) as time_since_last_call
FROM api_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY api_name
ORDER BY api_name;

COMMENT ON VIEW public.api_health_dashboard IS 'Dashboard santé des APIs (dernières 24h)';

-- =====================================================
-- 7. VUE - Top Patterns
-- =====================================================

CREATE OR REPLACE VIEW public.top_signal_patterns AS
SELECT
  pattern_name,
  total_occurrences,
  win_count,
  loss_count,
  win_rate,
  avg_pnl_percent,
  confidence_boost,
  last_seen_at
FROM signal_patterns
WHERE total_occurrences >= 5
ORDER BY win_rate DESC, total_occurrences DESC
LIMIT 20;

COMMENT ON VIEW public.top_signal_patterns IS 'Top 20 patterns avec meilleur win rate (min 5 occurrences)';
