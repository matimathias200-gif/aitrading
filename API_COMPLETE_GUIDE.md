# 🔍 RAPPORT COMPLET DES APIs - CryptoSignalAI

## ✅ APIs CONNECTÉES ET FONCTIONNELLES

---

## 1️⃣ API BINANCE (Trading Data)

### 🌐 REST API
**Base URL**: `https://api.binance.com/api/v3/`

#### Endpoint A: Données 24h de Marché
```
GET https://api.binance.com/api/v3/ticker/24hr
```

**Utilisé dans**: Edge Function `live-market-data-fetcher`
**Fréquence**: Toutes les 5 minutes (automatique)

**Ce qu'il fait**:
- Récupère prix actuel, volume 24h, variation % de TOUTES les cryptos
- Filtre ensuite selon votre watchlist (BTC, ETH, SOL, etc.)
- Retourne: lastPrice, priceChangePercent, volume, highPrice, lowPrice

**Données obtenues**:
```json
{
  "symbol": "BTCUSDT",
  "lastPrice": "67890.50",
  "priceChangePercent": "2.45",
  "volume": "12345.67",
  "highPrice": "68000.00",
  "lowPrice": "66500.00"
}
```

---

#### Endpoint B: Données Historiques (Klines)
```
GET https://api.binance.com/api/v3/klines
```

**Paramètres**:
- `symbol`: Ex: BTCUSDT
- `interval`: 1h (1 heure)
- `limit`: 100 dernières bougies

**Utilisé pour**: Calcul des indicateurs techniques
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- EMA 20 et EMA 50

**Données obtenues**:
```json
[
  [
    1234567890, // timestamp
    "67000.00",  // open
    "68000.00",  // high
    "66800.00",  // low
    "67500.00",  // close
    "1234.56"    // volume
  ]
]
```

**Comment ça marche**:
1. Edge Function fetch 100 bougies horaires
2. Extrait les prix de clôture pour calculs
3. Calcule RSI: moyenne des gains vs pertes
4. Calcule MACD: différence entre EMA12 et EMA26
5. Compare prix actuel avec EMA20/EMA50

---

### 🔴 WebSocket API (Temps Réel)
```
wss://stream.binance.com:9443/ws/!ticker@arr
```

**Utilisé dans**: `LiveMarketTable.jsx` via `BinanceWebSocketManager`

**Comment ça fonctionne**:
1. Connexion au stream Binance (tous les tickers)
2. Reçoit mise à jour prix TOUTES les secondes
3. Filtre uniquement les 10 cryptos de votre watchlist
4. Update l'interface en temps réel

**Données reçues** (stream continu):
```json
{
  "s": "BTCUSDT",     // symbol
  "c": "67890.50",    // current price
  "P": "2.45",        // price change %
  "q": "123456789.12",// quote volume
  "v": "12345.67"     // volume
}
```

**Fonctionnalités**:
- ✅ Reconnexion automatique (5 tentatives)
- ✅ Délai progressif: 3s, 6s, 9s, 12s, 15s
- ✅ Indicateur visuel "Live" (vert)
- ✅ Gestion des erreurs

**Code simplifié**:
```javascript
WebSocket → onmessage → Filtre watchlist → Update UI
```

---

## 2️⃣ API SUPABASE (Base de Données + Auth)

### 🗄️ Base de Données PostgreSQL
**URL**: `https://asnevyxhgnxtegfkbivb.supabase.co`

#### Tables Utilisées:

**A. crypto_signals**
```sql
SELECT * FROM crypto_signals 
WHERE status = 'active'
ORDER BY created_at DESC
```

**Contient**:
- symbol (BTCUSDT, ETHUSDT...)
- signal_type (BUY/SELL/WAIT)
- entry_price, take_profit, stop_loss
- confidence (0-100%)
- reason (explication JSON)
- status (active/taken/expired)

**Utilisé par**:
- Dashboard pour afficher les signaux
- SignalCard pour feedback utilisateur
- Analytics pour statistiques

---

**B. crypto_market_data**
```sql
SELECT * FROM crypto_market_data
ORDER BY volume_24h DESC
```

**Mise à jour**: Toutes les 5 minutes par Edge Function

**Contient**:
- symbol
- current_price
- change_24h
- volume_24h
- updated_at

**Utilisé par**:
- MarketHeatmap (heatmap colorée)
- MarketPage (vue complète marché)

---

**C. crypto_watchlist**
```sql
SELECT symbol FROM crypto_watchlist
WHERE is_active = true
```

**Liste par défaut**:
- BTCUSDT, ETHUSDT, BNBUSDT
- SOLUSDT, ADAUSDT, XRPUSDT
- DOGEUSDT, DOTUSDT, MATICUSDT, AVAXUSDT

**Utilisé par**:
- Edge Function (quels cryptos analyser)
- LiveMarketTable (WebSocket filter)

---

**D. settings**
```sql
SELECT * FROM settings
WHERE user_id = auth.uid()
```

**Paramètres utilisateur**:
- sensitivity_level (1-5)
- notifications_enabled (true/false)
- risk_profile (prudent/modéré/agressif)

**Créé automatiquement** lors inscription

---

**E. trade_feedback**
```sql
SELECT * FROM trade_feedback
WHERE user_id = auth.uid()
ORDER BY created_at DESC
```

**Stocke les résultats**:
- win / lose / neutral
- Pour apprentissage de l'IA

---

### 🔐 Supabase Auth
```javascript
supabase.auth.signUp()
supabase.auth.signInWithPassword()
supabase.auth.signOut()
```

**Fonctionnalités**:
- Inscription email/password
- Connexion sécurisée
- Gestion session automatique
- Trigger auto-création settings

---

### ⚡ Supabase Realtime
**3 Channels actifs**:

**1. crypto_signals_changes**
```javascript
supabase.channel('crypto_signals_changes')
  .on('INSERT', payload => {
    // Nouveau signal → Affiche notification
  })
```

**2. crypto_market_data_changes**
```javascript
supabase.channel('crypto_market_data_changes')
  .on('*', payload => {
    // Mise à jour marché → Refresh heatmap
  })
```

**3. settings_changes**
```javascript
supabase.channel('settings_changes')
  .on('UPDATE', payload => {
    // Paramètres modifiés → Update UI
  })
```

**Comment ça marche**:
1. Insert en DB → Trigger Postgres
2. Postgres → Supabase Realtime
3. Realtime → WebSocket client
4. Client → Update React state
5. React → Re-render UI

**Latence**: < 100ms ⚡

---

## 3️⃣ EDGE FUNCTION SUPABASE

### 🚀 live-market-data-fetcher
**URL**: `{SUPABASE_URL}/functions/v1/live-market-data-fetcher`
**Status**: ✅ ACTIVE

**Appelée par**:
- AutoSignalGenerator (toutes les 5min)
- InitialSignalGenerator (bouton manuel)

**Flow Complet**:

```
1. Fetch Watchlist depuis DB
   ↓
2. Call Binance API → Tous les tickers 24h
   ↓
3. Filtre uniquement watchlist (10 cryptos)
   ↓
4. Pour chaque crypto:
   - Fetch 100 bougies historiques
   - Calcule RSI (14 périodes)
   - Calcule MACD (EMA12 - EMA26)
   - Calcule EMA20 et EMA50
   - Calcule ratio volume
   ↓
5. Génère signaux selon stratégie:
   
   📈 BUY SI:
   - RSI < 35 (survente)
   - MACD haussier (histogram > 0)
   - Prix > EMA20
   - Volume > 120% moyenne
   
   📉 SELL SI:
   - RSI > 70 (surachat)
   - MACD baissier (histogram < 0)
   - Prix < EMA20
   - Variation < -3%
   ↓
6. Calcule Take Profit (+3%) et Stop Loss (-2%)
   ↓
7. Insert signaux dans crypto_signals (DB)
   ↓
8. Realtime notifie le frontend
   ↓
9. UI affiche nouveaux signaux instantanément
```

**Exemple de génération**:

**Entrée** (Binance API):
```json
{
  "symbol": "BTCUSDT",
  "lastPrice": "67500",
  "priceChangePercent": "2.5",
  "volume": "12345"
}
```

**Calculs**:
- RSI: 32 (< 35 ✅ survente)
- MACD: 0.5 (> 0 ✅ haussier)
- Prix vs EMA20: 67500 > 66800 ✅
- Volume: 140% moyenne ✅

**Sortie** (Signal généré):
```json
{
  "symbol": "BTCUSDT",
  "signal_type": "BUY",
  "entry_price": 67500,
  "take_profit": 69525,  // +3%
  "stop_loss": 66150,    // -2%
  "confidence": 70,
  "reason": {
    "explain": "Signal d'achat détecté sur BTC. Le RSI indique une survente (32.0), le MACD est haussier et le volume est 140% au-dessus de la moyenne.",
    "indicators": ["RSI en survente", "MACD haussier", "Volume fort"]
  }
}
```

---

## 📊 SCHÉMA DE FLUX COMPLET

```
┌─────────────────────────────────────────────────┐
│         SOURCES DE DONNÉES (EXTERNES)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  🌐 Binance REST API                           │
│     ├─ /ticker/24hr → Prix + Volume            │
│     └─ /klines → Historique                    │
│                                                 │
│  🔴 Binance WebSocket                          │
│     └─ wss://stream.binance.com                │
│                                                 │
└───────────────┬─────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────┐
│           TRAITEMENT (BACKEND)                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  🚀 Edge Function                              │
│     ├─ Fetch données Binance                   │
│     ├─ Calcul RSI, MACD, EMA                   │
│     ├─ Génération signaux BUY/SELL             │
│     └─ Insert dans DB                          │
│                                                 │
│  🗄️ Supabase PostgreSQL                       │
│     ├─ 5 Tables (signals, market, etc.)        │
│     ├─ RLS Security                            │
│     └─ Triggers                                │
│                                                 │
└───────────────┬─────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────┐
│          TEMPS RÉEL (MIDDLEWARE)                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚡ Supabase Realtime                          │
│     ├─ Écoute changements DB                   │
│     ├─ Push via WebSocket                      │
│     └─ Latence: < 100ms                        │
│                                                 │
└───────────────┬─────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────┐
│            INTERFACE (FRONTEND)                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚛️ React App (Vite)                           │
│     ├─ AutoSignalGenerator (5min)              │
│     ├─ LiveMarketTable (WebSocket)             │
│     ├─ SignalCard (Display + Feedback)         │
│     └─ MarketHeatmap (Visualisation)           │
│                                                 │
│  👤 Utilisateur                                 │
│     ├─ Voit signaux temps réel                 │
│     ├─ Donne feedback (win/lose)               │
│     └─ Configure paramètres                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## ⏱️ TIMING & FRÉQUENCES

| Action | Fréquence | Latence |
|--------|-----------|---------|
| 🔄 WebSocket Binance | Continue (stream) | < 50ms |
| 🤖 Génération signaux auto | 5 minutes | ~2-3s |
| ⚡ Realtime Supabase | Instantané | < 100ms |
| 📊 Update market data | 5 minutes | ~1s |
| 🔐 Session auth check | À la demande | < 200ms |

---

## ✅ STATUT DES APIs

| API | Statut | Test |
|-----|--------|------|
| 🌐 Binance REST | 🟢 CONNECTÉ | ✅ Testé |
| 🔴 Binance WebSocket | 🟢 CONNECTÉ | ✅ Reconnexion auto |
| 🗄️ Supabase DB | 🟢 CONNECTÉ | ✅ 5 tables actives |
| 🔐 Supabase Auth | 🟢 CONNECTÉ | ✅ Inscription OK |
| ⚡ Supabase Realtime | 🟢 CONNECTÉ | ✅ Push instantané |
| 🚀 Edge Function | 🟢 DÉPLOYÉE | ✅ Génère signaux |

---

## 🔐 SÉCURITÉ

### Binance API
- ✅ Aucune clé requise (endpoints publics)
- ✅ Lecture seule (pas de trading automatique)
- ✅ Rate limits respectés

### Supabase
- ✅ RLS activé sur toutes les tables
- ✅ JWT tokens pour authentification
- ✅ HTTPS uniquement
- ✅ Policies restrictives par user_id

### Edge Function
- ✅ Protégée par JWT (verify_jwt: true)
- ✅ Variables d'env sécurisées
- ✅ Pas de secrets dans le code

---

## 🎯 RÉSUMÉ SIMPLE

**Vos APIs fonctionnent comme ça**:

1. **Binance donne les prix** (REST + WebSocket)
   - REST: Prix, volume, historique
   - WebSocket: Temps réel continu

2. **Edge Function analyse** (toutes les 5min)
   - Calcule RSI, MACD, EMA
   - Décide BUY ou SELL
   - Insert dans DB

3. **Supabase stocke tout** (PostgreSQL)
   - Signaux, marché, feedback
   - Auth utilisateurs
   - Paramètres

4. **Realtime push les changements** (WebSocket)
   - Nouveau signal → Notif instantanée
   - Update marché → Refresh UI

5. **React affiche** (Interface)
   - Signaux en temps réel
   - Prix live
   - Graphiques animés

**C'est un système complet qui tourne en boucle automatiquement ! 🔄**

---

## 📈 EXEMPLE DE VIE D'UN SIGNAL

```
09:00:00 → AutoGenerator appelle Edge Function
09:00:01 → Edge Function fetch Binance (10 cryptos)
09:00:02 → Calcul RSI, MACD, EMA pour chaque crypto
09:00:03 → BTC: RSI=32, MACD=0.5 → ✅ SIGNAL BUY
09:00:04 → Insert dans crypto_signals (DB)
09:00:05 → Realtime push notification
09:00:06 → React affiche signal dans Dashboard
09:00:07 → Utilisateur voit le signal BUY BTC
09:15:00 → Utilisateur clique "Gagnant"
09:15:01 → Update status='taken', insert feedback
09:15:02 → Signal déplacé vers historique
09:15:03 → Analytics mis à jour (winrate +1)
```

**Total: 15 minutes de vie d'un signal, 100% automatisé ! ⚡**

