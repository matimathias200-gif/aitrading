/*
  # Create function_logs table for Claude AI traceability
  
  1. New Table
    - `function_logs` - Stores all Claude API calls with full context
      - `id` (uuid, primary key)
      - `function_name` (text) - Name of the edge function
      - `model_name` (text) - Claude model used
      - `request_id` (text) - Anthropic request ID
      - `prompt_length` (int) - Character count of prompt
      - `response_length` (int) - Character count of response
      - `tokens_used` (int) - Total tokens consumed
      - `confidence` (numeric) - Signal confidence returned
      - `signal_type` (text) - BUY/SELL/WAIT
      - `success` (boolean) - Whether call succeeded
      - `error_message` (text) - Error if failed
      - `latency_ms` (int) - Response time in milliseconds
      - `metadata` (jsonb) - Additional context
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Public read for monitoring
*/

CREATE TABLE IF NOT EXISTS public.function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  request_id TEXT,
  prompt_length INTEGER,
  response_length INTEGER,
  tokens_used INTEGER,
  confidence NUMERIC,
  signal_type TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  latency_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read function logs"
  ON public.function_logs
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_function_logs_created_at 
  ON public.function_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_function_logs_function_name 
  ON public.function_logs(function_name);

CREATE INDEX IF NOT EXISTS idx_function_logs_success 
  ON public.function_logs(success);
