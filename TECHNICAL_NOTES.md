# CryptoSignalAI - Notes Techniques

## Architecture Complète

### Base de Données Supabase

#### Tables Principales

1. **settings**
   - Paramètres utilisateur (sensibilité, profil de risque, notifications)
   - Lié à auth.users via user_id
   - Créé automatiquement via trigger lors de l'inscription

2. **crypto_signals**
   - Signaux de trading générés par l'IA
   - Contient : symbol, signal_type (BUY/SELL/WAIT), entry_price, take_profit, stop_loss, confidence, reason
   - Status : active/taken/expired

3. **crypto_market_data**
   - Données de marché en temps réel
   - Mise à jour par l'Edge Function

4. **crypto_watchlist**
   - Liste des cryptos à surveiller
   - Par défaut : BTC, ETH, BNB, SOL, ADA, XRP, DOGE, DOT, MATIC, AVAX

5. **trade_feedback**
   - Feedback utilisateur (win/lose/neutral)
   - Utilisé pour l'apprentissage de l'IA

### Edge Function : live-market-data-fetcher

**URL** : `{SUPABASE_URL}/functions/v1/live-market-data-fetcher`

**Fonctionnement** :
1. Récupère la watchlist active depuis la DB
2. Fetch les données depuis l'API Binance (prix, volume, variation 24h)
3. Calcule les indicateurs techniques :
   - RSI (Relative Strength Index)
   - MACD (Moving Average Convergence Divergence)
   - EMA 20 et EMA 50
4. Génère des signaux BUY/SELL selon la stratégie
5. Insère les signaux dans la DB
6. Retourne les signaux + données de marché

**Stratégie de Trading** :
- BUY si : RSI < 35, MACD haussier, volume élevé
- SELL si : RSI > 70, MACD baissier, prix sous EMA20
- Chaque signal a un take-profit (+3%) et stop-loss (-2%)

### Génération Automatique des Signaux

**Composant** : `AutoSignalGenerator.jsx`
- Appelle l'Edge Function toutes les 5 minutes
- Fonctionne uniquement pour les utilisateurs connectés
- Silencieux (pas de notification), les nouveaux signaux apparaissent via Realtime

### WebSocket Binance

**Classe** : `BinanceWebSocketManager`
- Reconnexion automatique (5 tentatives max)
- Filtre uniquement les symboles de la watchlist
- Affiche les prix en temps réel dans LiveMarketTable

### Realtime Supabase

**3 Channels** :
1. `crypto_signals_changes` : Écoute les nouveaux signaux
2. `crypto_market_data_changes` : Écoute les mises à jour marché
3. `settings_changes` : Écoute les changements de paramètres

**Optimisation** : Les channels ne se recréent pas à chaque changement de state

## Flow Complet

### Inscription Utilisateur
1. Utilisateur s'inscrit via Supabase Auth
2. Trigger `on_auth_user_created` crée automatiquement les settings
3. Redirection vers le dashboard

### Génération de Signaux
1. AutoSignalGenerator appelle l'Edge Function
2. Edge Function analyse le marché Binance
3. Calcule RSI, MACD, EMA
4. Génère des signaux si conditions remplies
5. Insert dans `crypto_signals`
6. Realtime notifie l'app → signal apparaît instantanément

### Feedback Utilisateur
1. Utilisateur clique "Enregistrer un résultat"
2. Choisit : Gagnant / Perdant / Neutre
3. Signal passe en status "taken"
4. Feedback enregistré dans `trade_feedback`
5. L'IA utilisera ces données pour améliorer les prédictions

## API Utilisées

- **Binance REST API** : `https://api.binance.com/api/v3/`
  - `/ticker/24hr` : Données 24h de tous les symboles
  - `/klines` : Données historiques pour calcul d'indicateurs

- **Binance WebSocket** : `wss://stream.binance.com:9443/ws/!ticker@arr`
  - Stream en temps réel de tous les tickers

## Commandes Utiles

```bash
# Développement
npm run dev

# Build production
npm run build

# Preview build
npm run preview
```

## Variables d'Environnement

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Sécurité

- **RLS activé** sur toutes les tables
- Les utilisateurs ne voient que leurs propres settings et feedback
- Les signaux sont visibles par tous (lecture seule)
- Edge Function protégée par JWT

## Performance

- **Lazy loading** : Les pages sont chargées à la demande
- **WebSocket** : Reconnexion automatique
- **Realtime optimisé** : Pas de re-render inutiles
- **Build size** : ~918 KB (272 KB gzipped)

## Prochaines Étapes

1. Ajouter un système de backtesting fonctionnel
2. Intégrer l'apprentissage machine basé sur le feedback
3. Ajouter des notifications push Web
4. Multi-timeframes (5m, 15m, 1h, 4h)
5. Export CSV des signaux
6. Dashboard admin
