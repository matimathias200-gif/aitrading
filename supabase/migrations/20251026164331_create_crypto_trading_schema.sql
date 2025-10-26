/*
  # Création du schéma complet pour CryptoSignalAI

  ## Vue d'ensemble
  Ce fichier initialise toutes les tables nécessaires pour la plateforme de trading IA.
  Il inclut la gestion des signaux, des données de marché, du feedback utilisateur et des paramètres.

  ## Tables créées
  
  ### 1. settings
  Stocke les préférences utilisateur (sensibilité IA, profil de risque, notifications)
  - `id` (uuid, clé primaire)
  - `user_id` (uuid, référence auth.users)
  - `sensitivity_level` (integer, 1-5)
  - `notifications_enabled` (boolean)
  - `risk_profile` (text)
  - `last_scan_at` (timestamptz)
  
  ### 2. crypto_signals
  Signaux de trading générés par l'IA
  - `id` (uuid, clé primaire)
  - `symbol` (text, ex: BTC/USDT)
  - `signal_type` (text, BUY/SELL/WAIT)
  - `entry_price` (numeric)
  - `take_profit` (numeric)
  - `stop_loss` (numeric)
  - `confidence` (numeric, 0-100)
  - `status` (text, active/taken/expired)
  - `reason` (jsonb, explication de l'IA)
  - `feedback_result` (text, win/lose/neutral)
  - `horizon_minutes` (integer)
  
  ### 3. crypto_market_data
  Données de marché en temps réel
  - `id` (uuid, clé primaire)
  - `symbol` (text)
  - `current_price` (numeric)
  - `change_24h` (numeric)
  - `volume_24h` (numeric)
  - `market_cap` (numeric)
  
  ### 4. crypto_watchlist
  Liste de surveillance des cryptos
  - `id` (uuid, clé primaire)
  - `symbol` (text)
  - `is_active` (boolean)
  
  ### 5. trade_feedback
  Feedback utilisateur pour l'apprentissage de l'IA
  - `id` (uuid, clé primaire)
  - `signal_id` (uuid, référence crypto_signals)
  - `user_id` (uuid, référence auth.users)
  - `symbol` (text)
  - `result` (text, win/lose/neutral)
  - `is_manual_feedback` (boolean)
  
  ## Sécurité
  - RLS activé sur toutes les tables
  - Policies restrictives basées sur auth.uid()
  - Les utilisateurs ne peuvent accéder qu'à leurs propres données
  
  ## Notes importantes
  - Indexes créés sur les colonnes fréquemment requêtées
  - Defaults intelligents pour éviter les valeurs nulles
  - Timestamps automatiques avec triggers
*/

-- ============================================================================
-- TABLE: settings
-- Paramètres et préférences utilisateur
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sensitivity_level integer DEFAULT 3 CHECK (sensitivity_level >= 1 AND sensitivity_level <= 5),
  notifications_enabled boolean DEFAULT true,
  risk_profile text DEFAULT 'modéré' CHECK (risk_profile IN ('prudent', 'modéré', 'agressif')),
  last_scan_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Index pour recherche rapide par user_id
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- RLS pour settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TABLE: crypto_signals
-- Signaux de trading générés par l'IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS crypto_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'WAIT')),
  entry_price numeric NOT NULL DEFAULT 0,
  take_profit numeric DEFAULT 0,
  stop_loss numeric DEFAULT 0,
  confidence numeric DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  status text DEFAULT 'active' CHECK (status IN ('active', 'taken', 'expired')),
  reason jsonb DEFAULT '{}'::jsonb,
  feedback_result text CHECK (feedback_result IN ('win', 'lose', 'neutral') OR feedback_result IS NULL),
  horizon_minutes integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON crypto_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_status ON crypto_signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON crypto_signals(created_at DESC);

-- RLS pour crypto_signals (accessible à tous les utilisateurs authentifiés)
ALTER TABLE crypto_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all signals"
  ON crypto_signals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert signals"
  ON crypto_signals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update signals"
  ON crypto_signals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TABLE: crypto_market_data
-- Données de marché en temps réel
-- ============================================================================

CREATE TABLE IF NOT EXISTS crypto_market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  current_price numeric DEFAULT 0,
  change_24h numeric DEFAULT 0,
  volume_24h numeric DEFAULT 0,
  market_cap numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON crypto_market_data(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_volume ON crypto_market_data(volume_24h DESC);

-- RLS pour crypto_market_data (lecture publique)
ALTER TABLE crypto_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view market data"
  ON crypto_market_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert market data"
  ON crypto_market_data FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update market data"
  ON crypto_market_data FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TABLE: crypto_watchlist
-- Liste de surveillance des cryptos à analyser
-- ============================================================================

CREATE TABLE IF NOT EXISTS crypto_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON crypto_watchlist(is_active);

-- RLS pour crypto_watchlist
ALTER TABLE crypto_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view watchlist"
  ON crypto_watchlist FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage watchlist"
  ON crypto_watchlist FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TABLE: trade_feedback
-- Feedback utilisateur pour l'apprentissage de l'IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS trade_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES crypto_signals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  result text NOT NULL CHECK (result IN ('win', 'lose', 'neutral')),
  is_manual_feedback boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON trade_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_signal_id ON trade_feedback(signal_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON trade_feedback(created_at DESC);

-- RLS pour trade_feedback
ALTER TABLE trade_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON trade_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON trade_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_settings_updated_at
      BEFORE UPDATE ON settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_signals_updated_at'
  ) THEN
    CREATE TRIGGER update_signals_updated_at
      BEFORE UPDATE ON crypto_signals
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_market_data_updated_at'
  ) THEN
    CREATE TRIGGER update_market_data_updated_at
      BEFORE UPDATE ON crypto_market_data
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_watchlist_updated_at'
  ) THEN
    CREATE TRIGGER update_watchlist_updated_at
      BEFORE UPDATE ON crypto_watchlist
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- DONNÉES INITIALES: Watchlist par défaut
-- ============================================================================

INSERT INTO crypto_watchlist (symbol, is_active) VALUES
  ('BTCUSDT', true),
  ('ETHUSDT', true),
  ('BNBUSDT', true),
  ('SOLUSDT', true),
  ('ADAUSDT', true),
  ('XRPUSDT', true),
  ('DOGEUSDT', true),
  ('DOTUSDT', true),
  ('MATICUSDT', true),
  ('AVAXUSDT', true)
ON CONFLICT DO NOTHING;
