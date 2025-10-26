/*
  # Mise à jour de la structure api_cache et création des tables manquantes

  1. Modifications api_cache
    - Ajoute les colonnes `api_name`, `endpoint`, `response_data`, `cached_at`, `expires_at`
    - Crée un index unique sur `api_name, endpoint`

  2. Nouvelles tables
    - `signal_feedback`: feedback sur les signaux de trading
    - `ai_learning_logs`: logs d'apprentissage de l'IA

  3. Sécurité
    - Enable RLS sur toutes les nouvelles tables
    - Politiques permettant l'accès authentifié
*/

-- Ajouter les nouvelles colonnes à api_cache
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_cache' AND column_name = 'api_name') THEN
    ALTER TABLE api_cache ADD COLUMN api_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_cache' AND column_name = 'endpoint') THEN
    ALTER TABLE api_cache ADD COLUMN endpoint text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_cache' AND column_name = 'response_data') THEN
    ALTER TABLE api_cache ADD COLUMN response_data jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_cache' AND column_name = 'cached_at') THEN
    ALTER TABLE api_cache ADD COLUMN cached_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_cache' AND column_name = 'expires_at') THEN
    ALTER TABLE api_cache ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Copier les données existantes dans les nouvelles colonnes
UPDATE api_cache 
SET 
  response_data = COALESCE(response_data, data),
  cached_at = COALESCE(cached_at, fetched_at)
WHERE response_data IS NULL OR cached_at IS NULL;

-- Créer un index unique
DROP INDEX IF EXISTS api_cache_api_name_endpoint_idx;
CREATE UNIQUE INDEX api_cache_api_name_endpoint_idx 
ON api_cache (api_name, endpoint) 
WHERE api_name IS NOT NULL AND endpoint IS NOT NULL;

-- Créer signal_feedback
CREATE TABLE IF NOT EXISTS signal_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES crypto_signals(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('success', 'failed', 'neutral')),
  profit_loss numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE signal_feedback ENABLE ROW LEVEL SECURITY;

-- Politiques pour signal_feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'signal_feedback' 
    AND policyname = 'Allow authenticated users to read feedback'
  ) THEN
    CREATE POLICY "Allow authenticated users to read feedback"
      ON signal_feedback FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'signal_feedback' 
    AND policyname = 'Allow authenticated users to insert feedback'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert feedback"
      ON signal_feedback FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Créer ai_learning_logs
CREATE TABLE IF NOT EXISTS ai_learning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_data jsonb NOT NULL,
  recommendations text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_learning_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour ai_learning_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_learning_logs' 
    AND policyname = 'Allow authenticated users to read logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to read logs"
      ON ai_learning_logs FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_learning_logs' 
    AND policyname = 'Allow service role to insert logs'
  ) THEN
    CREATE POLICY "Allow service role to insert logs"
      ON ai_learning_logs FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;