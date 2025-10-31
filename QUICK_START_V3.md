# ⚡ QUICK START - SYSTÈME V3.0

**Version**: 3.0 - Auto-Learning System
**Date**: 29 octobre 2024

---

## 🚀 LANCEMENT RAPIDE (5 MINUTES)

### 1. Démarrer les Fonctions Principales

```bash
# Test scan market
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/scan-market" \
  -H "Authorization: Bearer $ANON_KEY"

# Test génération signal
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/generate-btc-signal" \
  -H "Authorization: Bearer $ANON_KEY"
```

### 2. Lancer un Backtest (30 jours)

```bash
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/backtest-signals" \
  -H "Authorization: Bearer $ANON_KEY"
```

**Résultat attendu** (8-15 secondes):
```json
{
  "success": true,
  "signals_tested": 120,
  "winrate": 68.5,
  "avg_profit": 2.1,
  "best_pattern": "RSI_oversold_MACD_bullish_EMA_uptrend"
}
```

### 3. Vérifier le Risk Manager

```bash
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/update-risk-parameters" \
  -H "Authorization: Bearer $ANON_KEY"
```

### 4. Vérifier le WebSocket Streaming

1. Ouvrir le dashboard
2. Vérifier: `🟢 Connecté au stream`
3. Insérer un signal test:

```sql
INSERT INTO crypto_signals (symbol, signal_type, confidence, entry_price, take_profit, stop_loss, user_id)
VALUES ('BTCUSDT', 'BUY', 75, 114500, 116800, 113200, '00000000-0000-0000-0000-000000000000');
```

---

## ⚙️ CONFIGURATION CRON JOBS

```
scan-market          → */10 * * * * (10 min)
generate-btc-signal  → 0 * * * * (1h)
evaluate-trades      → 0 */2 * * * (2h)
backtest-signals     → 0 0 */2 * * (2 jours) ⭐ NEW
update-risk-parameters → 0 */6 * * * (6h) ⭐ NEW
system-audit         → 0 */6 * * * (6h)
```

---

**Version**: 3.0
**Statut**: ✅ **PRÊT**
