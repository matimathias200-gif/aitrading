/*
  # Create log_api_call RPC Function

  This function logs API calls for monitoring purposes.
  Parameters:
    - p_api_name: Name of the API being called
    - p_endpoint: API endpoint URL
    - p_status: Call status (OK, ERROR, TIMEOUT)
    - p_status_code: HTTP status code (nullable)
    - p_rows_received: Number of rows received (default 0)
    - p_response_time_ms: Response time in milliseconds
    - p_error_message: Error message if any (nullable)
*/

CREATE TABLE IF NOT EXISTS api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL,
  endpoint text,
  status text NOT NULL DEFAULT 'OK',
  status_code integer,
  rows_received integer DEFAULT 0,
  response_time_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_api_name ON api_logs(api_name);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);

ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage api_logs"
  ON api_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read api_logs"
  ON api_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION log_api_call(
  p_api_name text,
  p_endpoint text DEFAULT NULL,
  p_status text DEFAULT 'OK',
  p_status_code integer DEFAULT NULL,
  p_rows_received integer DEFAULT 0,
  p_response_time_ms integer DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO api_logs (api_name, endpoint, status, status_code, rows_received, response_time_ms, error_message)
  VALUES (p_api_name, p_endpoint, p_status, p_status_code, p_rows_received, p_response_time_ms, p_error_message);
END;
$$;