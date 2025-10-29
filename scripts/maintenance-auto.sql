-- ═════════════════════════════════════════════════════════════════
-- SCRIPT DE MAINTENANCE AUTOMATIQUE
-- À exécuter quotidiennement via cron job
-- ═════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_logs_deleted INTEGER;
    v_cache_cleaned INTEGER;
    v_signals_updated INTEGER;
BEGIN
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║    MAINTENANCE AUTOMATIQUE START      ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';

    -- ═══════════════════════════════════════════════════════════
    -- 1. NETTOYER LES VIEUX LOGS (> 30 JOURS)
    -- ═══════════════════════════════════════════════════════════

    RAISE NOTICE '1. Nettoyage des logs anciens...';

    WITH deleted AS (
        DELETE FROM function_logs
        WHERE created_at < NOW() - INTERVAL '30 days'
        RETURNING *
    )
    SELECT COUNT(*) INTO v_logs_deleted FROM deleted;

    RAISE NOTICE '   ✅ % logs supprimés', v_logs_deleted;

    -- ═══════════════════════════════════════════════════════════
    -- 2. NETTOYER LE CACHE EXPIRÉ (> 24H)
    -- ═══════════════════════════════════════════════════════════

    RAISE NOTICE '2. Nettoyage du cache expiré...';

    WITH deleted AS (
        DELETE FROM api_cache
        WHERE fetched_at < NOW() - INTERVAL '24 hours'
        RETURNING *
    )
    SELECT COUNT(*) INTO v_cache_cleaned FROM deleted;

    RAISE NOTICE '   ✅ % entrées de cache supprimées', v_cache_cleaned;

    -- ═══════════════════════════════════════════════════════════
    -- 3. MARQUER LES SIGNAUX EXPIRÉS COMME "EXPIRED"
    -- ═══════════════════════════════════════════════════════════

    RAISE NOTICE '3. Mise à jour des signaux expirés...';

    WITH updated AS (
        UPDATE crypto_signals
        SET status = 'expired',
            evaluated_at = NOW()
        WHERE status = 'active'
          AND created_at < NOW() - INTERVAL '1 day'
          AND horizon_minutes IS NOT NULL
          AND created_at < NOW() - (horizon_minutes || ' minutes')::INTERVAL
        RETURNING *
    )
    SELECT COUNT(*) INTO v_signals_updated FROM updated;

    RAISE NOTICE '   ✅ % signaux marqués comme expirés', v_signals_updated;

    -- ═══════════════════════════════════════════════════════════
    -- 4. METTRE À JOUR LES RÉPUTATIONS BTC
    -- ═══════════════════════════════════════════════════════════

    RAISE NOTICE '4. Mise à jour des réputations...';

    INSERT INTO crypto_reputation (symbol, win_count, loss_count, total_trades, success_rate, reputation_score)
    SELECT
        'BTCUSDT' as symbol,
        SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as win_count,
        SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as loss_count,
        COUNT(*) as total_trades,
        ROUND(100.0 * SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
        ROUND(50 + (100.0 * SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) / COUNT(*) - 50) * 1.5, 2) as reputation_score
    FROM trade_feedback
    WHERE symbol = 'BTCUSDT'
    ON CONFLICT (symbol)
    DO UPDATE SET
        win_count = EXCLUDED.win_count,
        loss_count = EXCLUDED.loss_count,
        total_trades = EXCLUDED.total_trades,
        success_rate = EXCLUDED.success_rate,
        reputation_score = EXCLUDED.reputation_score,
        last_updated_at = NOW();

    RAISE NOTICE '   ✅ Réputation BTC mise à jour';

    -- ═══════════════════════════════════════════════════════════
    -- 5. VACUUM ET ANALYZE
    -- ═══════════════════════════════════════════════════════════

    RAISE NOTICE '5. Optimisation des tables...';

    VACUUM ANALYZE crypto_signals;
    VACUUM ANALYZE trade_feedback;
    VACUUM ANALYZE function_logs;
    VACUUM ANALYZE api_cache;

    RAISE NOTICE '   ✅ Tables optimisées';

    -- ═══════════════════════════════════════════════════════════
    -- RÉSUMÉ
    -- ═══════════════════════════════════════════════════════════

    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║    MAINTENANCE COMPLETE                ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '  Logs supprimés: %', v_logs_deleted;
    RAISE NOTICE '  Cache nettoyé: %', v_cache_cleaned;
    RAISE NOTICE '  Signaux expirés: %', v_signals_updated;

END $$;
