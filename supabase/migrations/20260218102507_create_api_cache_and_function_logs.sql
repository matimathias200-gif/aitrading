/*
  # Create API Cache and Function Logs Tables

  1. New Tables
    - `api_cache` - Stores cached API responses for market data
      - `id` (uuid, primary key)
      - `api_name` (text) - Name of the API/endpoint
      - `response_data` (jsonb) - Cached response data
      - `fetched_at` (timestamptz) - When data was fetched
    - `function_logs` - Logs edge function executions
      - `id` (uuid, primary key)
      - `function_name` (text) - Name of the function
      - `success` (boolean) - Whether execution succeeded
      - `model_name` (text, nullable) - AI model used
      - `signal_type` (text, nullable) - Signal type generated
      - `confidence` (numeric, nullable) - Confidence score
      - `latency_ms` (integer, nullable) - Execution time
      - `metadata` (jsonb, nullable) - Additional metadata
      - `created_at` (timestamptz) - When log was created
    - `reputation` - Tracks symbol reputation scores
      - `id` (uuid, primary key)
      - `symbol` (text, unique) - Trading pair symbol
      - `reputation_score` (numeric) - Current reputation score
      - `updated_at` (timestamptz) - Last update time

  2. Security
    - Enable RLS on all tables
    - Service role can insert/update/select all
*/

CREATE TABLE IF NOT EXISTS api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL,
  response_data jsonb NOT NULL DEFAULT '{}',
  fetched_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_cache_api_name ON api_cache(api_name);
CREATE INDEX IF NOT EXISTS idx_api_cache_fetched_at ON api_cache(fetched_at DESC);

ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage api_cache"
  ON api_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read api_cache"
  ON api_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS function_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  model_name text,
  signal_type text,
  confidence numeric,
  latency_ms integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_function_logs_function_name ON function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_function_logs_created_at ON function_logs(created_at DESC);

ALTER TABLE function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage function_logs"
  ON function_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read function_logs"
  ON function_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  reputation_score numeric DEFAULT 50 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage reputation"
  ON reputation
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read reputation"
  ON reputation
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO reputation (symbol, reputation_score) VALUES ('BTCUSDT', 50), ('ETHUSDT', 50)
ON CONFLICT (symbol) DO NOTHING;