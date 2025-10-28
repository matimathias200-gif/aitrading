# 🚀 BTC ONLY - GUIDE DE DÉPLOIEMENT COMPLET

**Date**: 28 octobre 2024
**Statut**: Prêt pour déploiement
**Spécialisation**: Bitcoin uniquement (3 mois)

---

## 📋 RÉSUMÉ DES CHANGEMENTS

### 1. **SCAN-MARKET** (BTC ONLY)
- ✅ Scanne uniquement Bitcoin (BTCUSDT)
- ✅ Intègre 4 APIs externes:
  - **CoinGecko**: Prix, volume, market cap
  - **CoinMarketCap**: Dominance, capitalisation
  - **CryptoPanic**: News + sentiment (bullish/bearish/neutral)
  - **Santiment**: On-chain metrics (addresses actives, inflows/outflows)
- ✅ Utilise Claude Haiku (rapide et économique)
- ✅ Cache les résultats dans `api_cache` table

### 2. **GENERATE-BTC-SIGNAL** (ADVANCED)
- ✅ Utilise Claude 3.5 Sonnet (le plus puissant disponible en oct 2024)
- ✅ Génère des signaux **BUY**, **SELL**, ou **WAIT**
- ✅ Logique intelligente:
  - **BUY**: RSI < 30 + MACD haussier + volume fort
  - **SELL**: RSI > 70 + MACD baissier + volume faible
  - **WAIT**: Neutralité ou confiance < 65%
- ✅ Prompt étendu avec toutes les données disponibles
- ✅ Validation stricte (TP ≠ entry_price)
- ✅ Logs complets dans `function_logs`

### 3. **EVALUATE-TRADES** (AUTO-LEARNING)
- ✅ Évalue automatiquement les signaux passés
- ✅ Détermine WIN/LOSS/NEUTRAL
- ✅ Enregistre dans `trade_feedback`
- ✅ Tourne toutes les 2h (cron job recommandé)

### 4. **TABLES CRÉÉES**
- ✅ `function_logs` - Traçabilité complète des appels Claude
- ✅ `evaluated_at` column ajoutée à `crypto_signals`

---

## 🔧 CONFIGURATION REQUISE

### Variables d'environnement Supabase

Ces variables sont **déjà configurées** dans votre projet Supabase :

```bash
SUPABASE_URL=https://asnevyxhgnxtegfkbivb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[votre clé]
CLAUDE_API_KEY=[votre clé Anthropic]
```

### Variables API externes (optionnelles mais recommandées)

```bash
CMC_API_KEY=[CoinMarketCap API key]
CRYPTOPANIC_API_KEY=[CryptoPanic API key]
SANTIMENT_API_KEY=[Santiment API key]
```

**Note**: Si ces clés ne sont pas configurées, les fonctions continueront à fonctionner avec CoinGecko + Binance seulement.

---

## 📦 FICHIERS MODIFIÉS

```
supabase/functions/
├── scan-market/
│   └── index.ts ✅ NOUVEAU (BTC ONLY + 4 APIs)
├── generate-btc-signal/
│   ├── index.ts ✅ RÉÉCRIT (Claude 3.5 Sonnet + logique BUY/SELL)
│   └── prompt-extended.ts ✅ NOUVEAU (prompt complet)
└── evaluate-trades/
    └── index.ts ✅ NOUVEAU (auto-évaluation)

supabase/migrations/
├── create_function_logs_table.sql ✅ NOUVEAU
└── add_evaluated_at_to_crypto_signals.sql ✅ NOUVEAU
```

---

## 🚀 DÉPLOIEMENT

### Option A: Déploiement manuel via Supabase Dashboard

1. **Aller dans Supabase Dashboard** → Edge Functions
2. **Créer/Mettre à jour les fonctions**:
   - `scan-market`
   - `generate-btc-signal`
   - `evaluate-trades`
3. **Copier le code** depuis:
   - `/supabase/functions/scan-market/index.ts`
   - `/supabase/functions/generate-btc-signal/index.ts`
   - `/supabase/functions/evaluate-trades/index.ts`

### Option B: Déploiement automatique (recommandé si Supabase CLI installé)

```bash
# Si Supabase CLI est disponible
supabase functions deploy scan-market
supabase functions deploy generate-btc-signal
supabase functions deploy evaluate-trades
```

**IMPORTANT**: Les migrations SQL ont déjà été appliquées automatiquement.

---

## 🧪 TESTS

### 1. Tester SCAN-MARKET

```bash
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/scan-market" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmV2eXhoZ254dGVnZmtiaXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTAzMDUsImV4cCI6MjA3NjI4NjMwNX0.iGTpsV-MBNWqlY-WikSWBlvSK5Gx0PGoZLufOikLHO8"
```

**Résultat attendu**:
```json
{
  "success": true,
  "symbol": "BTCUSDT",
  "data": {
    "market": {
      "price": 67500,
      "change24h": 2.5,
      "volume24h": 25000000000,
      "marketCap": 1320000000000,
      "dominance": 54.2
    },
    "news": {
      "sentiment": "bullish",
      "count": 12,
      "headlines": [...]
    },
    "onchain": {...}
  },
  "analysis": "Le Bitcoin maintient sa tendance haussière..."
}
```

### 2. Tester GENERATE-BTC-SIGNAL

```bash
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/generate-btc-signal" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmV2eXhoZ254dGVnZmtiaXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTAzMDUsImV4cCI6MjA3NjI4NjMwNX0.iGTpsV-MBNWqlY-WikSWBlvSK5Gx0PGoZLufOikLHO8"
```

**Résultat attendu**:
```json
{
  "success": true,
  "signal": {
    "symbol": "BTCUSDT",
    "signal_type": "BUY",  // ou SELL ou WAIT
    "confidence": 72,
    "entry_price": 67500,
    "take_profit": 69200,
    "stop_loss": 66800,
    "horizon_minutes": 240,
    "reason": {
      "explain": "RSI sous 40 indique survente. MACD croise à la hausse. Volume en augmentation.",
      "indicators": ["RSI 38", "MACD crossover", "EMA20 > EMA50", "Volume ratio 1.4"]
    }
  },
  "market_data": {...},
  "indicators": {...}
}
```

### 3. Tester EVALUATE-TRADES

```bash
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/evaluate-trades" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmV2eXhoZ254dGVnZmtiaXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTAzMDUsImV4cCI6MjA3NjI4NjMwNX0.iGTpsV-MBNWqlY-WikSWBlvSK5Gx0PGoZLufOikLHO8"
```

**Résultat attendu**:
```json
{
  "success": true,
  "evaluated": 3,
  "current_price": 68200,
  "results": [
    {
      "signal_id": "abc-123",
      "result": "WIN",
      "profit_pct": "2.50",
      "exit_price": 69200
    }
  ]
}
```

---

## ⏰ CRON JOBS RECOMMANDÉS

Configurez ces cron jobs dans **Supabase Dashboard → Edge Functions → Cron**:

### 1. Scan Market (toutes les 10 minutes)
```
*/10 * * * * scan-market
```

### 2. Generate Signal (toutes les heures)
```
0 * * * * generate-btc-signal
```

### 3. Evaluate Trades (toutes les 2 heures)
```
0 */2 * * * evaluate-trades
```

---

## 📊 MONITORING

### Vérifier les logs Claude AI

```sql
SELECT
  function_name,
  model_name,
  confidence,
  signal_type,
  success,
  latency_ms,
  created_at
FROM function_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Vérifier les signaux actifs

```sql
SELECT
  symbol,
  signal_type,
  confidence,
  entry_price,
  take_profit,
  stop_loss,
  status,
  created_at
FROM crypto_signals
WHERE status = 'active'
ORDER BY created_at DESC;
```

### Vérifier les résultats d'évaluation

```sql
SELECT
  signal_type,
  result,
  confidence,
  pnl_percent,
  created_at
FROM trade_feedback
ORDER BY created_at DESC
LIMIT 20;
```

### Calculer le win rate

```sql
SELECT
  signal_type,
  COUNT(*) as total,
  SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
  ROUND(100.0 * SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) / COUNT(*), 2) as win_rate
FROM trade_feedback
GROUP BY signal_type;
```

---

## 🎯 MODÈLES CLAUDE UTILISÉS

| Fonction | Modèle | Raison |
|----------|--------|--------|
| `scan-market` | `claude-3-haiku-20240307` | Rapide et économique pour analyse légère |
| `generate-btc-signal` | `claude-3-5-sonnet-20240620` | Le plus puissant disponible pour décisions critiques |
| `evaluate-trades` | N/A | Logique simple, pas d'IA requise |
| `learn-from-feedback` | `claude-3-opus-20240229` | Pour apprentissage profond (à implémenter) |

**Note**: Si vous avez accès à Claude 4, remplacez:
- `claude-3-5-sonnet-20240620` → `claude-4-sonnet` (si disponible)
- `claude-3-haiku-20240307` → `claude-4-haiku` (si disponible)

---

## 🔒 SÉCURITÉ

- ✅ RLS activé sur toutes les tables
- ✅ Service role key utilisée côté serveur uniquement
- ✅ CORS configuré correctement
- ✅ Validation des données avant insertion
- ✅ Logs complets pour audit

---

## 🐛 DÉPANNAGE

### Erreur: "Claude API error: 404"

**Problème**: Le modèle Claude n'existe pas.

**Solution**: Vérifiez que vous utilisez:
- `claude-3-5-sonnet-20240620` (disponible)
- Pas `claude-sonnet-4.0` (n'existe pas encore en oct 2024)

### Erreur: "CLAUDE_API_KEY not configured"

**Solution**: Ajoutez votre clé Anthropic dans:
1. Supabase Dashboard → Settings → Edge Functions → Secrets
2. Nom: `CLAUDE_API_KEY`
3. Valeur: `sk-ant-...`

### Erreur: "Failed to fetch CoinGecko data"

**Solution**: CoinGecko a des rate limits. Attendez 1 minute et réessayez.

### Signal WAIT au lieu de BUY/SELL

**Raison**: Confidence < 65% ou marché neutre.

**Normal**: L'IA ne génère des signaux que quand elle est sûre (> 65%).

---

## 📈 ROADMAP (3 MOIS)

### Mois 1: Stabilisation BTC ONLY
- ✅ Scan market toutes les 10 min
- ✅ Génération signaux BUY/SELL
- ✅ Auto-évaluation WIN/LOSS
- 🔄 Amélioration continue du prompt Claude

### Mois 2: Optimisation IA
- 🔄 Intégration Santiment complète (GraphQL)
- 🔄 Apprentissage automatique renforcé
- 🔄 Ajustement dynamique des TP/SL
- 🔄 Dashboard analytics avancé

### Mois 3: Multi-crypto (phase 2)
- 🔄 Réactivation ETH, SOL, LINK, etc.
- 🔄 Correlation analysis entre cryptos
- 🔄 Portfolio optimization
- 🔄 Risk management avancé

---

## 📞 SUPPORT

Pour toute question ou problème:
1. Vérifiez les logs dans `function_logs`
2. Testez manuellement chaque fonction avec `curl`
3. Vérifiez que toutes les migrations SQL ont été appliquées

---

## ✅ CHECKLIST FINALE

Avant de considérer le déploiement terminé :

- [ ] Les 3 fonctions sont déployées sur Supabase
- [ ] Les 2 migrations SQL ont été appliquées
- [ ] CLAUDE_API_KEY est configurée
- [ ] Test de `scan-market` réussit
- [ ] Test de `generate-btc-signal` réussit
- [ ] Test de `evaluate-trades` réussit
- [ ] Les cron jobs sont configurés
- [ ] Dashboard affiche les nouveaux signaux
- [ ] Les logs dans `function_logs` sont visibles

---

**Déploiement préparé par**: Claude AI Assistant
**Date**: 28 octobre 2024
**Version**: BTC ONLY v1.0
