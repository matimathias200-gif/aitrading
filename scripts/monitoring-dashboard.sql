-- ═════════════════════════════════════════════════════════════════
-- DASHBOARD DE MONITORING COMPLET - BTC ONLY SYSTEM
-- ═════════════════════════════════════════════════════════════════

\echo '╔════════════════════════════════════════════════════════════╗'
\echo '║         BTC ONLY - MONITORING DASHBOARD                   ║'
\echo '╚════════════════════════════════════════════════════════════╝'
\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 1. SYSTEM HEALTH CHECK
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '1. SYSTEM HEALTH CHECK'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    'Functions' as component,
    COUNT(*) as total,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
    ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_pct,
    ROUND(AVG(latency_ms), 0) as avg_latency_ms,
    MAX(created_at) as last_execution
FROM function_logs
WHERE created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT
    'Signals Generated' as component,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
    ROUND(AVG(confidence), 2) as avg_confidence,
    NULL as avg_latency_ms,
    MAX(created_at) as last_execution
FROM crypto_signals
WHERE created_at > NOW() - INTERVAL '24 hours';

\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 2. FONCTION LOGS (DERNIÈRES 24H)
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '2. EDGE FUNCTIONS PERFORMANCE (24H)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    function_name,
    model_name,
    COUNT(*) as calls,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
    ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
    ROUND(AVG(latency_ms), 0) as avg_latency_ms,
    ROUND(MAX(latency_ms), 0) as max_latency_ms,
    MAX(created_at) as last_call
FROM function_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name, model_name
ORDER BY calls DESC;

\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 3. SIGNAUX BTC (DERNIÈRES 24H)
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '3. SIGNAUX BTC GÉNÉRÉS (24H)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    signal_type,
    status,
    COUNT(*) as count,
    ROUND(AVG(confidence), 2) as avg_confidence,
    ROUND(AVG(entry_price), 2) as avg_entry_price,
    MAX(created_at) as last_created
FROM crypto_signals
WHERE created_at > NOW() - INTERVAL '24 hours'
    AND symbol = 'BTCUSDT'
GROUP BY signal_type, status
ORDER BY signal_type, status;

\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 4. PERFORMANCE DES SIGNAUX (HISTORIQUE)
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '4. PERFORMANCE DES SIGNAUX (HISTORIQUE)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    signal_type,
    result,
    COUNT(*) as count,
    ROUND(AVG(confidence), 2) as avg_confidence,
    ROUND(AVG(pnl_percent), 2) as avg_pnl_pct,
    ROUND(MIN(pnl_percent), 2) as min_pnl_pct,
    ROUND(MAX(pnl_percent), 2) as max_pnl_pct
FROM trade_feedback
WHERE symbol = 'BTCUSDT'
GROUP BY signal_type, result
ORDER BY signal_type, result;

\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 5. WIN RATE PAR TYPE DE SIGNAL
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '5. WIN RATE PAR TYPE DE SIGNAL'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    signal_type,
    COUNT(*) as total_trades,
    SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losses,
    ROUND(100.0 * SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as win_rate_pct,
    ROUND(AVG(CASE WHEN result = 'WIN' THEN pnl_percent ELSE NULL END), 2) as avg_win_pct,
    ROUND(AVG(CASE WHEN result = 'LOSS' THEN pnl_percent ELSE NULL END), 2) as avg_loss_pct,
    ROUND(AVG(pnl_percent), 2) as avg_total_pnl_pct
FROM trade_feedback
WHERE symbol = 'BTCUSDT'
GROUP BY signal_type;

\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 6. RÉPUTATION BTC
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '6. RÉPUTATION BTC'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    symbol,
    win_count,
    loss_count,
    total_trades,
    ROUND(success_rate, 2) as success_rate_pct,
    ROUND(reputation_score, 2) as reputation_score,
    last_updated_at
FROM crypto_reputation
WHERE symbol = 'BTCUSDT';

\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 7. API CACHE STATUS
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '7. API CACHE STATUS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    api_name,
    source,
    fetched_at,
    AGE(NOW(), fetched_at) as age,
    CASE
        WHEN AGE(NOW(), fetched_at) < INTERVAL '15 minutes' THEN '✅ FRESH'
        WHEN AGE(NOW(), fetched_at) < INTERVAL '1 hour' THEN '⚠️ OLD'
        ELSE '❌ STALE'
    END as status
FROM api_cache
WHERE api_name LIKE '%btc%' OR api_name LIKE '%scan%'
ORDER BY fetched_at DESC
LIMIT 10;

\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 8. DERNIERS SIGNAUX ACTIFS
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '8. DERNIERS SIGNAUX ACTIFS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    signal_type,
    confidence,
    entry_price,
    take_profit,
    stop_loss,
    AGE(NOW(), created_at) as age,
    status
FROM crypto_signals
WHERE symbol = 'BTCUSDT'
    AND status = 'active'
ORDER BY created_at DESC
LIMIT 5;

\echo ''

-- ═════════════════════════════════════════════════════════════════
-- 9. ERREURS RÉCENTES
-- ═════════════════════════════════════════════════════════════════

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '9. ERREURS RÉCENTES (24H)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    function_name,
    error_message,
    created_at,
    AGE(NOW(), created_at) as time_ago
FROM function_logs
WHERE success = false
    AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo '╚════════════════════════════════════════════════════════════╝'
\echo '             MONITORING DASHBOARD COMPLETE'
\echo '═════════════════════════════════════════════════════════════'
