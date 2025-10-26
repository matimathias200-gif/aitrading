# Guide de Démarrage Rapide - CryptoSignalAI

## Configuration Terminée ✅

Votre plateforme de trading IA est maintenant **100% fonctionnelle** avec :

- ✅ Base de données Supabase complète (5 tables principales)
- ✅ Edge Function pour générer des signaux intelligents
- ✅ Génération automatique toutes les 5 minutes
- ✅ WebSocket Binance avec reconnexion automatique
- ✅ Système de feedback utilisateur
- ✅ Authentification sécurisée
- ✅ Interface temps réel

---

## Comment Tester

### 1. Inscription / Connexion

1. Lancez l'application (elle est déjà en cours d'exécution)
2. Cliquez sur le bouton de connexion dans le header
3. Créez un nouveau compte ou connectez-vous

**Note** : Vos paramètres (sensibilité, profil de risque) sont créés automatiquement !

---

### 2. Générer les Premiers Signaux

**Option A : Bouton Manuel**
- Si aucun signal n'existe, un bouton "Générer des signaux" apparaît
- Cliquez dessus pour lancer l'analyse IA
- L'IA analyse les 10 cryptos de la watchlist (BTC, ETH, BNB, SOL, etc.)

**Option B : Automatique**
- Attendez 5 minutes, le système génère automatiquement
- Les nouveaux signaux apparaissent instantanément (Realtime)

---

### 3. Explorer le Dashboard

**Sections principales** :

1. **Heatmap du Marché** : Visualisation des variations 24h
2. **Signaux Actifs** : Opportunités BUY/SELL actuelles
3. **Panneau de Contrôle IA** :
   - Ajustez la sensibilité (1-5)
   - Activez/désactivez les notifications
   - Choisissez votre profil de risque

4. **Marché en Direct** : Prix temps réel via WebSocket Binance
5. **Historique** : Tous les trades passés

---

### 4. Utiliser un Signal

Chaque signal affiche :
- **Symbole** (ex: BTCUSDT)
- **Type** : BUY (vert) / SELL (rouge)
- **Prix d'entrée** : Où acheter/vendre
- **Take Profit** : Objectif de gain (+3%)
- **Stop Loss** : Protection (-2%)
- **Confiance** : Pourcentage de confiance de l'IA
- **Raison** : Explication en français

**Enregistrer le résultat** :
1. Cliquez sur "Enregistrer un résultat"
2. Choisissez : Gagnant / Perdant / Neutre
3. Le signal passe en historique
4. Feedback stocké pour l'apprentissage de l'IA

---

### 5. Analyser les Performances

1. Cliquez sur "Analytics" dans le menu
2. Visualisez :
   - Nombre de trades gagnants/perdants
   - Taux de réussite (winrate)
   - Graphique d'évolution
   - Historique complet

---

## Fonctionnalités Avancées

### Personnalisation

**Sensibilité de l'IA** (1-5) :
- **1-2** : Très prudent, signaux rares mais sûrs
- **3** : Équilibré (par défaut)
- **4-5** : Agressif, plus de signaux mais risqués

**Profil de Risque** :
- **Prudent** : Stop-loss plus serrés
- **Modéré** : Équilibre risque/rendement
- **Agressif** : Take-profit plus élevés

### Pages Disponibles

- `/` : Dashboard principal
- `/market` : Vue complète du marché
- `/signals/active` : Tous les signaux actifs
- `/analytics` : Analyse des performances

---

## Indicateurs Techniques Utilisés

L'IA analyse automatiquement :

1. **RSI (Relative Strength Index)**
   - < 35 : Signal d'achat (survente)
   - > 70 : Signal de vente (surachat)

2. **MACD (Moving Average Convergence Divergence)**
   - Histogram > 0 : Tendance haussière
   - Histogram < 0 : Tendance baissière

3. **EMA (Exponential Moving Average)**
   - EMA 20 et EMA 50
   - Prix > EMA : Tendance haussière
   - Prix < EMA : Tendance baissière

4. **Volume**
   - Volume > moyenne : Confirmation du signal
   - Volume faible : Signal moins fiable

---

## Architecture Technique

### Génération de Signaux

```
Binance API → Edge Function → Calcul Indicateurs → Stratégie IA
                                                           ↓
                                                    Supabase DB
                                                           ↓
                                                   Realtime → App
```

### Flow Temps Réel

1. **WebSocket Binance** : Prix live (stream continu)
2. **Supabase Realtime** : Nouveaux signaux (push instantané)
3. **Auto-refresh** : Données marché toutes les 5 min

---

## Dépannage

### Aucun signal ne s'affiche

1. Vérifiez que vous êtes connecté
2. Cliquez sur "Générer des signaux"
3. Attendez 10-15 secondes (analyse en cours)
4. Si erreur, vérifiez la console (F12)

### WebSocket déconnecté

- L'indicateur "Live" doit être vert
- Si rouge, rechargez la page
- Reconnexion automatique en 3-15 secondes

### Les prix ne se mettent pas à jour

1. Vérifiez votre connexion internet
2. Le WebSocket se reconnecte automatiquement
3. Rafraîchissez la page si problème persiste

---

## Prochaines Étapes Recommandées

1. ✅ Testez avec un compte démo
2. ✅ Enregistrez des feedback sur plusieurs signaux
3. ✅ Observez l'amélioration de l'IA
4. 🚀 Ajoutez vos propres cryptos à la watchlist
5. 🚀 Personnalisez les paramètres selon votre style

---

## Support Technique

- Documentation technique : `TECHNICAL_NOTES.md`
- Tables DB : Voir migration `create_crypto_trading_schema`
- Edge Function : `/supabase/functions/live-market-data-fetcher`

**Votre plateforme est prête à trader ! 🚀📈**
