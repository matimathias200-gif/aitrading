/*
  # Create crypto_prices table for market data

  1. New Tables
    - `crypto_prices`
      - `id` (uuid, primary key)
      - `symbol` (text) - Cryptocurrency symbol (e.g., BTC, ETH)
      - `price` (decimal) - Current price in USD
      - `change_24h` (decimal) - 24-hour price change percentage
      - `volume_24h` (decimal) - 24-hour trading volume
      - `market_cap` (decimal) - Market capitalization
      - `last_updated` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `crypto_prices` table
    - Add policy for authenticated users to read data
    - Add policy for service role to insert/update data

  3. Indexes
    - Add index on symbol for faster lookups
    - Add index on last_updated for time-based queries
*/

CREATE TABLE IF NOT EXISTS crypto_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  price decimal(20, 8) DEFAULT 0,
  change_24h decimal(10, 4) DEFAULT 0,
  volume_24h decimal(20, 2) DEFAULT 0,
  market_cap decimal(20, 2) DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crypto_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read crypto prices"
  ON crypto_prices
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can insert crypto prices"
  ON crypto_prices
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update crypto prices"
  ON crypto_prices
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_crypto_prices_symbol ON crypto_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_last_updated ON crypto_prices(last_updated DESC);

-- Insert initial market data
INSERT INTO crypto_prices (symbol, price, change_24h, volume_24h, market_cap) VALUES
  ('BTCUSDT', 109950.00, 1.81, 1728000000, 2170000000000),
  ('ETHUSDT', 3875.04, 3.02, 1548000000, 465000000000),
  ('SOLUSDT', 185.63, -5.31, 457430000, 91000000000),
  ('BNBUSDT', 1088.18, 0.02, 407400000, 163000000000),
  ('XRPUSDT', 2.5068, 0.61, 227520000, 142000000000),
  ('DOGEUSDT', 0.18732, 1.17, 110470000, 27500000000),
  ('SUIUSDT', 2.3837, 1.33, 68530000, 6800000000),
  ('TRXUSDT', 0.2968, 0.41, 56240000, 25500000000),
  ('ADAUSDT', 0.6149, 0.77, 49160000, 21500000000),
  ('LTCUSDT', 98.36, 4.17, 46540000, 7340000000)
ON CONFLICT (symbol) DO UPDATE SET
  price = EXCLUDED.price,
  change_24h = EXCLUDED.change_24h,
  volume_24h = EXCLUDED.volume_24h,
  market_cap = EXCLUDED.market_cap,
  last_updated = now();
