/*
  # Fix All Security Issues - Complete and Correct
  
  Addresses ALL Supabase security warnings:
  - Missing foreign key indexes
  - Suboptimal RLS policies (auth.uid())
  - Multiple permissive policies
  - RLS not enabled on public tables
  - Function search path issues
  - Duplicate constraints
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_active_positions_signal_id ON public.active_positions(signal_id);
CREATE INDEX IF NOT EXISTS idx_active_positions_user_id ON public.active_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_trades_signal_id ON public.manual_trades(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_feedback_signal_id ON public.signal_feedback(signal_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_signal_id ON public.trade_history(signal_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_user_id ON public.trade_history(user_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES (auth.uid() -> SELECT)
-- =====================================================

-- settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.settings;

CREATE POLICY "Users can view own settings" ON public.settings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own settings" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own settings" ON public.settings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- trade_feedback
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.trade_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.trade_feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.trade_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.trade_feedback;

CREATE POLICY "Users can view own feedback" ON public.trade_feedback
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own feedback" ON public.trade_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_portfolios
DROP POLICY IF EXISTS "Users can view own portfolio" ON public.user_portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolio" ON public.user_portfolios;
DROP POLICY IF EXISTS "Users can update own portfolio" ON public.user_portfolios;

CREATE POLICY "Users can view own portfolio" ON public.user_portfolios
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own portfolio" ON public.user_portfolios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own portfolio" ON public.user_portfolios
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- active_positions
DROP POLICY IF EXISTS "Users can view own positions" ON public.active_positions;
DROP POLICY IF EXISTS "Users can manage own positions" ON public.active_positions;

CREATE POLICY "Users can manage own positions" ON public.active_positions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- trade_history
DROP POLICY IF EXISTS "Users can view own trade history" ON public.trade_history;
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trade_history;

CREATE POLICY "Users can view own trade history" ON public.trade_history
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own trades" ON public.trade_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. FIX MULTIPLE PERMISSIVE POLICIES
-- =====================================================

-- crypto_market_data
DROP POLICY IF EXISTS "Anyone can view market data" ON public.crypto_market_data;
DROP POLICY IF EXISTS "Enable read access for all users on market data" ON public.crypto_market_data;
CREATE POLICY "Public can view market data" ON public.crypto_market_data FOR SELECT USING (true);

-- crypto_signals
DROP POLICY IF EXISTS "Authenticated users can view all signals" ON public.crypto_signals;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.crypto_signals;
CREATE POLICY "Authenticated users can view signals" ON public.crypto_signals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can update signals" ON public.crypto_signals;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.crypto_signals;
CREATE POLICY "Authenticated users can update signals" ON public.crypto_signals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- crypto_watchlist
DROP POLICY IF EXISTS "Anyone can view watchlist" ON public.crypto_watchlist;
DROP POLICY IF EXISTS "Authenticated users can manage watchlist" ON public.crypto_watchlist;
CREATE POLICY "Authenticated users can manage watchlist" ON public.crypto_watchlist FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 4. REMOVE DUPLICATE CONSTRAINT
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crypto_watchlist_symbol_key') THEN
    ALTER TABLE public.crypto_watchlist DROP CONSTRAINT crypto_watchlist_symbol_key;
  END IF;
END $$;

-- =====================================================
-- 5. ENABLE RLS ON PUBLIC TABLES
-- =====================================================

ALTER TABLE public.manual_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onchain_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_reputation ENABLE ROW LEVEL SECURITY;

-- Policies for RLS-enabled tables
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.manual_trades;
CREATE POLICY "Authenticated users can manage manual trades" ON public.manual_trades FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can view news sentiment" ON public.news_sentiment FOR SELECT USING (true);
CREATE POLICY "Public can view onchain metrics" ON public.onchain_metrics FOR SELECT USING (true);
CREATE POLICY "Public can view api cache" ON public.api_cache FOR SELECT USING (true);
CREATE POLICY "Public can view crypto reputation" ON public.crypto_reputation FOR SELECT USING (true);

-- =====================================================
-- 6. FIX FUNCTION SEARCH PATHS (correct signatures)
-- =====================================================

ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_portfolio_value() SET search_path = public, pg_temp;
ALTER FUNCTION public.close_signal(uuid, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_pnl(numeric, numeric, numeric, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_calculate_position_pnl() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_crypto_reputation() SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_expired_recommendations() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
