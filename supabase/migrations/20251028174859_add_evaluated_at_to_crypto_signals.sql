/*
  # Add evaluated_at column to crypto_signals
  
  1. Changes
    - Add `evaluated_at` column to track when signal was evaluated
    - This prevents re-evaluation of the same signal
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crypto_signals' AND column_name = 'evaluated_at'
  ) THEN
    ALTER TABLE public.crypto_signals ADD COLUMN evaluated_at TIMESTAMPTZ;
  END IF;
END $$;
