# 📝 MIGRATION LOG - 27 OCTOBRE 2025

## 🎯 Objectif : Refonte complète - Focus BTC uniquement

---

## 🗓️ 27 OCTOBRE 2025 - 00:35 UTC

### ✅ ÉTAPE 1 : AUDIT COMPLET
**Status** : ✅ Terminé
**Fichier** : `AUDIT_REPORT.md`
**Résultats** :
- 29 Edge Functions identifiées (17 à archiver)
- 17 Tables identifiées (4 à supprimer)
- Problème Claude AI 404 identifié
- Signaux BTC périmés (8 jours)

---

## ⏳ ÉTAPE 2 : MODE MAINTENANCE
**Status** : ⏳ En attente validation
**Action** :
```bash
# TODO : Activer mode maintenance frontend
# Message : "Maintenance en cours - Optimisation du système Bitcoin"
```

---

## 🔧 ÉTAPE 3 : CORRECTION CLAUDE AI (PRIORITÉ ABSOLUE)

### 🎯 Fonctions à corriger

#### 1. `generate-btc-signal`
**Fichier** : `supabase/functions/generate-btc-signal/index.ts`
**Ligne** : 234
**Changement** :
```typescript
// AVANT
model: 'claude-3-5-sonnet-20241022'  // ❌ 404 error

// APRÈS
model: 'claude-sonnet-4-5-20250929'  // ✅ Version 2025
```
**Status** : ✅ Modifié localement - ⏳ Redéploiement requis

#### 2. `scan-market`
**Fichier** : `supabase/functions/scan-market/index.ts`
**Ligne** : 162
**Status** : ⏳ À corriger

#### 3. `learn-from-feedback`
**Fichier** : `supabase/functions/learn-from-feedback/index.ts`
**Ligne** : 141
**Status** : ⏳ À corriger

---

## 🗑️ ÉTAPE 4 : SUPPRESSION DES DOUBLONS

### Fonctions à archiver (17)

#### Edge Functions redondantes
1. ❌ **`generate-crypto-signal`**
   - Raison : Doublon de `generate-btc-signal`
   - Action : Archiver et documenter
   - Date prévue : 27/10/2025

2. ❌ **`generate-signal`**
   - Raison : Doublon générique
   - Action : Supprimer

3. ❌ **`get-crypto-signal`**
   - Raison : Read-only inutile
   - Action : Archiver

4. ❌ **`fetch-market-data`**
   - Raison : Doublon de fetch-coingecko
   - Action : Supprimer

5. ❌ **`fetch-crypto-market-data`**
   - Raison : Doublon
   - Action : Supprimer

6. ❌ **`live-market-data-fetcher`**
   - Raison : Logique redondante
   - Action : Supprimer

7. ❌ **`merge-data`**
   - Raison : Vide / non utilisé
   - Action : Supprimer

8. ❌ **`fetch-news`**
   - Raison : Fusionné dans CryptoPanic
   - Action : Fusionner logique

9. ❌ **`fetch-onchain`**
   - Raison : Fusionné dans Santiment
   - Action : Fusionner logique

10. ❌ **`evaluate-strategy`**
    - Raison : Non utilisé
    - Action : Archiver

11. ❌ **`backtest-strategy`**
    - Raison : Non utilisé
    - Action : Archiver

12. ❌ **`update-model-weekly`**
    - Raison : Non utilisé
    - Action : Archiver

13. ❌ **`scheduled-market-scan`**
    - Raison : Doublon orchestrator
    - Action : Supprimer

14. ❌ **`auto-risk-manager`**
    - Raison : Vide
    - Action : Supprimer

15. ❌ **`get-recommendation`**
    - Raison : Non utilisé
    - Action : Archiver

16. ❌ **`paper-processor`**
    - Raison : Hors scope
    - Action : Supprimer

17. ❌ **`analyze-with-ai`**
    - Raison : Doublon Claude
    - Action : Archiver

### Tables à nettoyer (4)

1. ❌ **`news_sentiment`**
   - Raison : Vide, jamais utilisée
   - Action : `DROP TABLE news_sentiment CASCADE;`
   - Backup : Non requis (vide)

2. ❌ **`onchain_metrics`**
   - Raison : Vide, jamais utilisée
   - Action : `DROP TABLE onchain_metrics CASCADE;`
   - Backup : Non requis (vide)

3. ❌ **`manual_trades`**
   - Raison : Ancien système, remplacé par trade_history
   - Action : Archiver dans `archived_manual_trades`
   - Backup : ✅ Requis (3 rows)

4. ⚠️ **`crypto_market_data`**
   - Raison : Doublon partiel de api_cache
   - Action : Fusionner logique dans api_cache
   - Backup : ✅ Requis (5 rows)

---

## 🎯 ÉTAPE 5 : FOCUS BTC UNIQUEMENT

### Nettoyer crypto_watchlist
```sql
-- Backup avant modification
CREATE TABLE archived_crypto_watchlist AS
SELECT * FROM crypto_watchlist WHERE symbol != 'BTCUSDT';

-- Désactiver tous sauf BTC
UPDATE crypto_watchlist
SET is_active = false
WHERE symbol != 'BTCUSDT' AND symbol != 'BTC';

-- Vérification
SELECT symbol, is_active FROM crypto_watchlist ORDER BY is_active DESC;
```
**Status** : ⏳ À exécuter
**Date prévue** : 27/10/2025

### Nettoyer signaux périmés
```sql
-- Archiver signaux > 7 jours
UPDATE crypto_signals
SET status = 'expired'
WHERE created_at < NOW() - INTERVAL '7 days'
  AND status = 'active';

-- Statistiques
SELECT
  status,
  COUNT(*) as count
FROM crypto_signals
GROUP BY status;
```
**Status** : ⏳ À exécuter

---

## 🔧 ÉTAPE 6 : CENTRALISATION LOGIQUE API

### Créer helper `fetchWithFallback`
**Fichier** : `supabase/functions/_shared/fetchWithFallback.ts`

```typescript
export async function fetchBTCPriceWithFallback(supabase: any) {
  const BINANCE_URLS = [
    'https://api-gateway.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
    'https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT',
    'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'
  ];

  // Try Binance URLs
  for (const url of BINANCE_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return { success: true, data: await response.json(), source: 'binance' };
      }
    } catch (error) {
      console.log(`Binance failed: ${url}`);
    }
  }

  // Fallback to CoinGecko
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin');
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        data: {
          symbol: 'BTCUSDT',
          lastPrice: data.market_data.current_price.usd.toString(),
          priceChangePercent: data.market_data.price_change_percentage_24h.toString()
        },
        source: 'coingecko'
      };
    }
  } catch (error) {
    console.log('CoinGecko failed');
  }

  // Fallback to cache
  const { data: cached } = await supabase
    .from('api_cache')
    .select('response_data')
    .or('source.eq.coingecko_markets,source.eq.cmc_listings')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    return { success: true, data: cached.response_data, source: 'cache' };
  }

  throw new Error('All price sources failed');
}
```
**Status** : ⏳ À créer

---

## 🤖 ÉTAPE 7 : UTILITAIRE CLAUDE AI

### Créer `invokeClaude` helper
**Fichier** : `supabase/functions/_shared/invokeClaude.ts`

```typescript
interface ClaudeOptions {
  maxTokens?: number;
  temperature?: number;
  retries?: number;
}

export async function invokeClaude(
  prompt: string,
  claudeApiKey: string,
  options: ClaudeOptions = {}
) {
  const {
    maxTokens = 1200,
    temperature = 0.7,
    retries = 3
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.content[0].text;

      // Validate JSON response
      try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        console.log('[invokeClaude] Success', {
          request_id: data.id,
          tokens: data.usage?.output_tokens
        });

        return { success: true, data: parsed, raw: text };
      } catch (parseError) {
        console.error('[invokeClaude] Parse error:', text);
        return {
          success: false,
          error: 'Invalid JSON from Claude',
          raw: text
        };
      }

    } catch (error) {
      console.error(`[invokeClaude] Attempt ${attempt}/${retries} failed:`, error.message);

      if (attempt === retries) {
        return {
          success: false,
          error: error.message
        };
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}
```
**Status** : ⏳ À créer

---

## 🧪 ÉTAPE 8 : TESTS AUTOMATIQUES

### Script `run_full_test.sh`
```bash
#!/bin/bash
set -e

echo "🧪 Tests complets - Focus BTC"

# 1. Nettoyer cache
echo "1️⃣ Nettoyage cache..."
curl -X DELETE "$SUPABASE_URL/rest/v1/api_cache?api_name=eq.test" \
  -H "apikey: $SUPABASE_ANON_KEY"

# 2. Vérifier BTC dans watchlist
echo "2️⃣ Vérification watchlist BTC..."
WATCHLIST=$(curl -s "$SUPABASE_URL/rest/v1/crypto_watchlist?symbol=eq.BTCUSDT&select=is_active" \
  -H "apikey: $SUPABASE_ANON_KEY")
echo "Watchlist: $WATCHLIST"

# 3. Tester fetch-coingecko
echo "3️⃣ Test fetch-coingecko..."
COINGECKO=$(curl -s -X POST "$SUPABASE_URL/functions/v1/fetch-coingecko" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY")
echo "CoinGecko: ${COINGECKO:0:200}"

# 4. Générer signal BTC
echo "4️⃣ Génération signal BTC..."
SIGNAL=$(curl -s -X POST "$SUPABASE_URL/functions/v1/generate-btc-signal" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY")
echo "Signal: ${SIGNAL:0:300}"

# 5. Vérifier signal inséré
echo "5️⃣ Vérification signal en base..."
SIGNALS=$(curl -s "$SUPABASE_URL/rest/v1/crypto_signals?order=created_at.desc&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY")
echo "Dernier signal: $SIGNALS"

echo "✅ Tests terminés"
```
**Status** : ⏳ À créer et exécuter

---

## 📊 CHANGELOG

| Date | Action | Fichier | Status |
|------|--------|---------|--------|
| 27/10 00:32 | Audit complet | `AUDIT_REPORT.md` | ✅ |
| 27/10 00:35 | Migration log | `MIGRATION_LOG.md` | ✅ |
| 27/10 00:40 | Correction Claude model | `generate-btc-signal/index.ts` | ⏳ |
| 27/10 - | Export schema SQL | `supabase_schema.sql` | ⏳ |
| 27/10 - | Tests automatiques | `run_full_test.sh` | ⏳ |
| 27/10 - | Utilitaire Claude | `_shared/invokeClaude.ts` | ⏳ |
| 27/10 - | Helper fallbacks | `_shared/fetchWithFallback.ts` | ⏳ |

---

## ⚠️ NOTES IMPORTANTES

1. **Backup avant destruction** :
   - Toujours créer `archived_{table}` avant DROP
   - Export SQL complet avant migration schema

2. **RLS obligatoire** :
   - Toutes les nouvelles tables doivent avoir RLS enabled
   - Policies restrictives par défaut

3. **Tests avant prod** :
   - Exécuter `run_full_test.sh` avant réactivation
   - Vérifier logs dans `system_logs`

4. **Documentation** :
   - Chaque changement documenté ici
   - Timestamp + raison + fichiers impactés

---

**Log créé le 27 octobre 2025 à 00:35 UTC**
**Dernière mise à jour : 27 octobre 2025 à 00:35 UTC**
