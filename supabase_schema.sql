-- ============================================================================
-- SUPABASE SCHEMA EXPORT - CRYPTOSIGNAL AI
-- ============================================================================
-- Database: asnevyxhgnxtegfkbivb.supabase.co
-- Export Date: 27 octobre 2025, 00:33 UTC
-- Focus: Bitcoin (BTC/USDT) uniquement
-- ============================================================================

-- ============================================================================
-- TABLE: crypto_signals
-- Description: Signaux de trading générés par l'IA
-- Rows: 23 (tous périmés - derniers du 19/10)
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crypto_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT,
    signal_type TEXT CHECK (signal_type IN ('BUY', 'SELL')),
    confidence NUMERIC,
    entry_price NUMERIC,
    take_profit NUMERIC,
    stop_loss NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    reason JSONB,
    horizon_minutes INTEGER DEFAULT 60,
    last_confirmed_at TIMESTAMPTZ,
    confirmation_count INTEGER DEFAULT 0,
    source TEXT,
    volatility_24h NUMERIC
);

ALTER TABLE public.crypto_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.crypto_signals FOR SELECT USING (true);

-- ============================================================================
-- TABLE: trade_feedback
-- Description: Feedback sur les résultats des trades
-- Rows: 21
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trade_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES public.crypto_signals(id),
    user_id UUID REFERENCES auth.users(id),
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    entry_price NUMERIC NOT NULL,
    take_profit NUMERIC,
    stop_loss NUMERIC,
    confidence NUMERIC,
    result TEXT NOT NULL,
    pnl_percent NUMERIC,
    is_manual_feedback BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trade_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feedback" ON public.trade_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: signal_feedback (À FUSIONNER avec trade_feedback)
-- Description: Feedback alternatif (redondant)
-- Rows: 0
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.signal_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES public.crypto_signals(id),
    feedback_type TEXT CHECK (feedback_type IN ('success', 'failed', 'neutral')) NOT NULL,
    profit_loss NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.signal_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: api_cache
-- Description: Cache des réponses API externes
-- Rows: 4 (CoinGecko, CMC, CryptoPanic, Santiment)
-- RLS: ❌ Disabled (À ACTIVER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL UNIQUE,
    data JSONB,
    fetched_at TIMESTAMPTZ NOT NULL,
    api_name TEXT,
    endpoint TEXT,
    response_data JSONB,
    cached_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- TODO: Activer RLS
-- ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: crypto_reputation
-- Description: Score de réputation par crypto
-- Rows: 1 (BTC uniquement)
-- RLS: ❌ Disabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crypto_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    win_count INTEGER NOT NULL DEFAULT 0,
    loss_count INTEGER NOT NULL DEFAULT 0,
    total_trades INTEGER NOT NULL DEFAULT 0,
    success_rate NUMERIC NOT NULL DEFAULT 0.00,
    reputation_score NUMERIC NOT NULL DEFAULT 50.00,
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: crypto_watchlist
-- Description: Liste des cryptos à surveiller
-- Rows: 31 (À NETTOYER - garder BTC uniquement)
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crypto_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_checked TIMESTAMPTZ,
    coingecko_id TEXT
);

ALTER TABLE public.crypto_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read watchlist" ON public.crypto_watchlist FOR SELECT USING (true);

-- Nettoyage: Désactiver tous sauf BTC
-- UPDATE public.crypto_watchlist SET is_active = false WHERE symbol != 'BTCUSDT';

-- ============================================================================
-- TABLE: system_logs
-- Description: Logs système et erreurs
-- Rows: 3
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_level TEXT CHECK (log_level IN ('info', 'warning', 'error', 'critical')) NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: ai_model_versions
-- Description: Versions du modèle IA Claude
-- Rows: 1
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    model_name TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',  -- À METTRE À JOUR vers claude-sonnet-4-5-20250929
    performance_metrics JSONB,
    is_active BOOLEAN DEFAULT false,
    deployed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_model_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: ai_learning_logs
-- Description: Logs d'apprentissage de l'IA
-- Rows: 0
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_learning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_data JSONB NOT NULL,
    recommendations TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_learning_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: active_positions
-- Description: Positions de trading ouvertes
-- Rows: 0
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.active_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    signal_id UUID REFERENCES public.crypto_signals(id),
    symbol TEXT NOT NULL,
    position_type TEXT CHECK (position_type IN ('BUY', 'SELL')) NOT NULL,
    entry_price NUMERIC NOT NULL,
    current_price NUMERIC,
    quantity NUMERIC NOT NULL DEFAULT 1,
    take_profit NUMERIC,
    stop_loss NUMERIC,
    pnl NUMERIC DEFAULT 0,
    pnl_percent NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.active_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own positions" ON public.active_positions
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: trade_history
-- Description: Historique complet des trades
-- Rows: 0
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    signal_id UUID REFERENCES public.crypto_signals(id),
    symbol TEXT NOT NULL,
    trade_type TEXT CHECK (trade_type IN ('BUY', 'SELL')) NOT NULL,
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    quantity NUMERIC NOT NULL DEFAULT 1,
    pnl NUMERIC DEFAULT 0,
    pnl_percent NUMERIC DEFAULT 0,
    fees NUMERIC DEFAULT 0,
    result TEXT CHECK (result IN ('win', 'loss', 'breakeven')),
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history" ON public.trade_history
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: user_portfolios
-- Description: Portefeuilles utilisateurs
-- Rows: 0
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    total_value NUMERIC DEFAULT 10000.00,
    available_balance NUMERIC DEFAULT 10000.00,
    invested_amount NUMERIC DEFAULT 0,
    total_pnl NUMERIC DEFAULT 0,
    win_rate NUMERIC DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own portfolio" ON public.user_portfolios
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: settings
-- Description: Paramètres utilisateurs
-- Rows: 3
-- RLS: Enabled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    sensitivity_level INTEGER DEFAULT 3 CHECK (sensitivity_level >= 1 AND sensitivity_level <= 5),
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confidence_modifier NUMERIC DEFAULT 0,
    risk_profile TEXT DEFAULT 'modéré',
    last_scan_at TIMESTAMPTZ
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings" ON public.settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.settings
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLES À SUPPRIMER (Vides ou redondantes)
-- ============================================================================

-- ❌ news_sentiment (0 rows - jamais utilisée)
-- DROP TABLE IF EXISTS public.news_sentiment CASCADE;

-- ❌ onchain_metrics (0 rows - jamais utilisée)
-- DROP TABLE IF EXISTS public.onchain_metrics CASCADE;

-- ❌ manual_trades (3 rows - ancien système, archiver d'abord)
-- CREATE TABLE archived_manual_trades AS SELECT * FROM public.manual_trades;
-- DROP TABLE IF EXISTS public.manual_trades CASCADE;

-- ⚠️ crypto_market_data (5 rows - fusionner avec api_cache)
-- Migration requise avant suppression

-- ============================================================================
-- INDEXES RECOMMANDÉS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_crypto_signals_symbol ON public.crypto_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_signals_created_at ON public.crypto_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_signals_status ON public.crypto_signals(status);

CREATE INDEX IF NOT EXISTS idx_trade_feedback_signal_id ON public.trade_feedback(signal_id);
CREATE INDEX IF NOT EXISTS idx_trade_feedback_user_id ON public.trade_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_api_cache_source ON public.api_cache(source);
CREATE INDEX IF NOT EXISTS idx_api_cache_fetched_at ON public.api_cache(fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_level ON public.system_logs(log_level);

-- ============================================================================
-- DONNÉES INITIALES (BTC uniquement)
-- ============================================================================

-- Ajouter BTC dans la watchlist si absent
INSERT INTO public.crypto_watchlist (symbol, is_active, coingecko_id)
VALUES ('BTCUSDT', true, 'bitcoin')
ON CONFLICT (symbol) DO UPDATE SET is_active = true;

-- Initialiser réputation BTC si absente
INSERT INTO public.crypto_reputation (symbol, win_count, loss_count, total_trades, success_rate, reputation_score)
VALUES ('BTCUSDT', 9, 12, 21, 42.86, 50.00)
ON CONFLICT (symbol) DO NOTHING;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_active_positions_updated_at
    BEFORE UPDATE ON public.active_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_portfolios_updated_at
    BEFORE UPDATE ON public.user_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIN DU SCHEMA
-- ============================================================================

-- Pour restaurer ce schema:
-- psql -h asnevyxhgnxtegfkbivb.supabase.co -U postgres -d postgres < supabase_schema.sql

-- Export généré le 27 octobre 2025 à 00:33 UTC
