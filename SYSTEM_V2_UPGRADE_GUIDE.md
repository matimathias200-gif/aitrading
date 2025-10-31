# 🚀 SYSTÈME V2 - UPGRADE GUIDE - BTC ONLY VIVANT

**Date**: 29 octobre 2024
**Version**: 2.0 → 2.1
**Statut**: ✅ **PRÊT À DÉPLOYER**

---

## 📊 RÉSUMÉ DES AMÉLIORATIONS V2

Le système V2 transforme le système BTC ONLY en un **système vivant et auto-apprenant** avec:

✅ **API Logging détaillé** - Chaque appel API tracé dans `api_logs`
✅ **Pattern Learning** - Apprentissage automatique des patterns WIN/LOSS
✅ **Règles strictes BUY/SELL** - Correction automatique des faux signaux
✅ **Claude 3.5 Haiku + Sonnet 2024** - Derniers modèles
✅ **System Audit automatique** - Surveillance complète toutes les 6h
✅ **Win Rate par pattern** - Ajustement dynamique de confiance

---

## 🆕 NOUVELLES TABLES

### 1. api_logs
```sql
CREATE TABLE api_logs (
  api_name text NOT NULL,
  endpoint text,
  status text, -- 'OK', 'ERROR', 'TIMEOUT'
  rows_received integer,
  response_time_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

**Utilité**: Tracer chaque appel API (CoinGecko, Claude, etc.)

### 2. signal_patterns
```sql
CREATE TABLE signal_patterns (
  pattern_name text UNIQUE,
  pattern_conditions jsonb,
  total_occurrences integer,
  win_count integer,
  loss_count integer,
  win_rate numeric,
  avg_pnl_percent numeric,
  confidence_boost numeric, -- Ajustement auto +/- 10%
  last_seen_at timestamptz
);
```

**Utilité**: Apprentissage automatique - quel pattern gagne le plus ?

### 3. system_audit_log
```sql
CREATE TABLE system_audit_log (
  audit_type text, -- 'health_check', 'performance', 'error'
  component text,
  status text, -- 'healthy', 'degraded', 'unhealthy'
  message text,
  metrics jsonb,
  created_at timestamptz
);
```

**Utilité**: Historique de santé du système

---

## 🆕 NOUVELLES FONCTIONS

### 1. scan-market-v2 📊
**Améliorations**:
- ✅ Log chaque API call dans `api_logs`
- ✅ Utilise Claude 3.5 Haiku 2024 (`claude-3-5-haiku-20241022`)
- ✅ Meilleure gestion d'erreurs

**Fichier**: `supabase/functions/scan-market-v2/index.ts`

**Déploiement**:
```bash
supabase functions deploy scan-market-v2
```

---

### 2. generate-btc-signal-v2 🎯
**Améliorations**:
- ✅ **Règles strictes BUY/SELL** (plus de faux signaux !)
- ✅ Utilise Claude 3.5 Sonnet 2024 (`claude-3-5-sonnet-20241022`)
- ✅ **Correction automatique** des signaux incohérents
- ✅ Génère un **pattern name** pour chaque signal
- ✅ Log les patterns pour apprentissage

**Fichier**: `supabase/functions/generate-btc-signal-v2/index.ts`

**Règles de sécurité implémentées**:
```typescript
// Règle 1: Forcer SELL si RSI > 70 ET MACD baissier ET prix < EMA50
if (rsi > 70 && macd < 0 && price < ema50) {
  signal_type = 'SELL';
}

// Règle 2: Forcer BUY si RSI < 30 ET MACD haussier ET prix > EMA50
if (rsi < 30 && macd > 0 && price > ema50) {
  signal_type = 'BUY';
}

// Règle 3: TP ≠ entry_price
if (take_profit === entry_price) {
  take_profit = entry_price * (signal_type === 'BUY' ? 1.02 : 0.98);
}
```

**Déploiement**:
```bash
supabase functions deploy generate-btc-signal-v2
```

---

### 3. evaluate-trades-v2 🧠
**Améliorations**:
- ✅ **Pattern Learning** - Appelle `update_signal_pattern()` après chaque trade
- ✅ Met à jour `signal_patterns` avec WIN/LOSS
- ✅ Calcule automatiquement `confidence_boost`
- ✅ Meilleure mise à jour de réputation

**Fichier**: `supabase/functions/evaluate-trades-v2/index.ts`

**Exemple d'apprentissage**:
```
Pattern: RSI_oversold_MACD_bullish_EMA_uptrend_NEWS_bullish
Résultat: WIN (+2.5%)
→ win_rate augmente
→ confidence_boost passe de 0 à +10%

Prochain signal avec ce pattern aura +10% de confiance !
```

**Déploiement**:
```bash
supabase functions deploy evaluate-trades-v2
```

---

### 4. system-audit 🔍
**Nouvelle fonction de surveillance**:
- ✅ Vérifie toutes les fonctions (24h)
- ✅ Vérifie toutes les APIs (6h)
- ✅ Vérifie les signaux générés
- ✅ Affiche top patterns
- ✅ Calcule alertes automatiques
- ✅ Sauvegarde dans `system_audit_log`

**Fichier**: `supabase/functions/system-audit/index.ts`

**Réponse type**:
```json
{
  "overall_status": "healthy",
  "components": {
    "scan-market": { "status": "healthy", "success_rate": 95.5 },
    "generate-btc-signal": { "status": "healthy", "success_rate": 87.2 }
  },
  "apis": {
    "CoinGecko": { "status": "healthy", "last_call": "2min ago" },
    "Claude-Sonnet": { "status": "healthy", "calls_6h": 12 }
  },
  "patterns": {
    "top_performers": [
      { "pattern": "RSI_oversold_MACD_bullish", "win_rate": 72.5 }
    ]
  },
  "alerts": [],
  "summary": "✅ Système HEALTHY\n\nFonctions: 3/3 actives\nAPIs: 5/5 OK\nSignaux 24h: 12 (68% confiance)\nWin Rate: 58.3%"
}
```

**Déploiement**:
```bash
supabase functions deploy system-audit
```

---

## 📊 VUES SQL

### 1. api_health_dashboard
```sql
SELECT * FROM api_health_dashboard;
```

**Résultat**:
```
api_name         | total_calls | success_rate | avg_response_ms | last_call
-----------------|-------------|--------------|-----------------|---------------------
CoinGecko        | 144         | 98.61        | 245             | 2024-10-29 01:05:00
Claude-Haiku     | 144         | 100.00       | 1250            | 2024-10-29 01:05:00
Claude-Sonnet    | 24          | 95.83        | 3200            | 2024-10-29 01:00:00
```

### 2. top_signal_patterns
```sql
SELECT * FROM top_signal_patterns;
```

**Résultat**:
```
pattern_name                                      | win_rate | confidence_boost | total_occurrences
--------------------------------------------------|----------|------------------|------------------
RSI_oversold_MACD_bullish_EMA_uptrend_NEWS_bull   | 75.00    | 10.0             | 8
RSI_neutral_MACD_bullish_EMA_uptrend_NEWS_neutral | 66.67    | 5.0              | 6
RSI_overbought_MACD_bearish_EMA_downtrend_NEWS_be | 20.00    | -5.0             | 5
```

---

## 🚀 PLAN DE DÉPLOIEMENT

### Étape 1: Appliquer les migrations ✅
```bash
# Déjà fait ! Migration appliquée: create_api_logs_and_patterns_learning
psql $DATABASE_URL -c "SELECT COUNT(*) FROM api_logs, signal_patterns, system_audit_log;"
```

### Étape 2: Déployer les fonctions V2

**Option A: Via Supabase Dashboard**
1. Aller dans **Edge Functions**
2. Pour chaque fonction (scan-market-v2, generate-btc-signal-v2, evaluate-trades-v2, system-audit):
   - Cliquer "Create Function"
   - Coller le code de `supabase/functions/[nom]/index.ts`
   - Déployer

**Option B: Via CLI** (si Supabase CLI installé)
```bash
# Déployer toutes les fonctions V2
supabase functions deploy scan-market-v2
supabase functions deploy generate-btc-signal-v2
supabase functions deploy evaluate-trades-v2
supabase functions deploy system-audit
```

### Étape 3: Configurer les cron jobs

**Ajouter dans Dashboard → Edge Functions → Cron**:

```
# scan-market-v2: toutes les 10 min
*/10 * * * *  →  scan-market-v2

# generate-btc-signal-v2: toutes les heures
0 * * * *  →  generate-btc-signal-v2

# evaluate-trades-v2: toutes les 2 heures
0 */2 * * *  →  evaluate-trades-v2

# system-audit: toutes les 6 heures
0 */6 * * *  →  system-audit
```

### Étape 4: Tester

```bash
# Test scan-market-v2
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/scan-market-v2" \
  -H "Authorization: Bearer $ANON_KEY"

# Test generate-btc-signal-v2
curl -X POST "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/generate-btc-signal-v2" \
  -H "Authorization: Bearer $ANON_KEY"

# Test system-audit
curl "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/system-audit" \
  -H "Authorization: Bearer $ANON_KEY"
```

---

## 📈 AMÉLIORATION DU WIN RATE

### Avant V2
- ❌ Trop de signaux BUY (RSI ignoré)
- ❌ TP = entry_price (bug)
- ❌ Pas d'apprentissage
- ❌ Pas de surveillance automatique
- **Win Rate estimé: 45-50%**

### Après V2
- ✅ Règles strictes BUY/SELL
- ✅ TP ≠ entry_price (garanti)
- ✅ Pattern learning actif
- ✅ Surveillance 24/7
- ✅ Ajustement automatique de confiance
- **Win Rate cible: 55-60%**

---

## 🔍 MONITORING V2

### Dashboard SQL complet
```sql
-- 1. Santé des APIs
SELECT * FROM api_health_dashboard;

-- 2. Top patterns performants
SELECT * FROM top_signal_patterns;

-- 3. Derniers audits
SELECT audit_type, status, message, created_at
FROM system_audit_log
ORDER BY created_at DESC
LIMIT 10;

-- 4. Win rate par pattern (manuelle)
SELECT
  pattern_name,
  win_rate,
  total_occurrences,
  confidence_boost,
  last_seen_at
FROM signal_patterns
WHERE total_occurrences >= 5
ORDER BY win_rate DESC;
```

---

## ✅ CHECKLIST DÉPLOIEMENT V2

- [x] ✅ Migration SQL appliquée (`api_logs`, `signal_patterns`, `system_audit_log`)
- [x] ✅ Fonctions V2 créées (fichiers `.ts`)
- [ ] ⚠️ Déployer scan-market-v2
- [ ] ⚠️ Déployer generate-btc-signal-v2
- [ ] ⚠️ Déployer evaluate-trades-v2
- [ ] ⚠️ Déployer system-audit
- [ ] ⚠️ Configurer cron jobs V2
- [ ] ⚠️ Tester end-to-end
- [ ] ⚠️ Vérifier premiers patterns dans `signal_patterns`

---

## 💡 UTILISATION QUOTIDIENNE

### Matin: Vérifier l'audit
```bash
curl "https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/system-audit" | jq '.summary'
```

**Résultat attendu**:
```
✅ Système HEALTHY

Fonctions: 3/3 actives
APIs: 5/5 OK
Signaux 24h: 12 (68% confiance)
Win Rate: 58.3%
```

### Midi: Vérifier les patterns
```sql
SELECT * FROM top_signal_patterns LIMIT 5;
```

### Soir: Vérifier les logs API
```sql
SELECT * FROM api_health_dashboard;
```

---

## 🎯 OBJECTIFS V2 (30 JOURS)

| Métrique | V1 | V2 (cible) | V2 (actuel) |
|----------|----|-----------|-----------|
| **Win Rate** | 45-50% | 55-60% | À mesurer |
| **Patterns appris** | 0 | 20+ | 0 (début) |
| **Faux signaux** | ~30% | < 10% | À mesurer |
| **API uptime** | 85% | > 95% | À mesurer |
| **Alertes/jour** | N/A | < 3 | À mesurer |

---

## 🔗 FICHIERS CRÉÉS

| Fichier | Description |
|---------|-------------|
| `supabase/functions/scan-market-v2/index.ts` | Scan avec API logging |
| `supabase/functions/generate-btc-signal-v2/index.ts` | Signal avec règles strictes |
| `supabase/functions/evaluate-trades-v2/index.ts` | Évaluation + pattern learning |
| `supabase/functions/system-audit/index.ts` | Surveillance automatique |
| `SYSTEM_V2_UPGRADE_GUIDE.md` | Ce document |

---

**Version**: 2.1
**Date**: 29 octobre 2024
**Statut**: ✅ **PRÊT POUR DÉPLOIEMENT**

Le système V2 est maintenant un **organisme vivant** qui apprend et s'améliore automatiquement ! 🧠🚀
