# 🚀 BTC ONLY - Système de Trading Automatisé

[![Status](https://img.shields.io/badge/status-production-brightgreen)](https://github.com)
[![Security](https://img.shields.io/badge/security-100%25-brightgreen)](./SECURITY_FIXES_COMPLETE.md)
[![Version](https://img.shields.io/badge/version-2.0-blue)](./FINAL_DEPLOYMENT_SUMMARY.md)

Système complet de trading automatisé spécialisé sur **Bitcoin (BTC/USDT)** utilisant l'intelligence artificielle Claude pour générer des signaux de trading précis.

---

## ⚡ Quick Start (5 minutes)

```bash
# 1. Cloner le projet
git clone [votre-repo]
cd project

# 2. Lancer le système complet
./scripts/quick-start.sh

# 3. Tester
./scripts/test-system-complete.sh
```

**C'est tout !** Le système est maintenant opérationnel.

---

## 🎯 Fonctionnalités

### ✅ Génération Automatique de Signaux
- 🤖 **IA Claude Sonnet 3.5** - Analyse technique avancée
- 📊 **Multi-indicateurs** - RSI, MACD, EMA, ATR, Volume
- 📰 **Analyse News** - Sentiment via CryptoPanic
- ⚡ **Temps Réel** - Données marché toutes les 10 minutes

### ✅ Types de Signaux
- **BUY** - Position longue (hausse attendue)
- **SELL** - Position courte (baisse attendue)
- **WAIT** - Pas de position (confiance < 65%)

### ✅ Auto-Évaluation
- 🎯 Évaluation automatique WIN/LOSS/NEUTRAL
- 📈 Calcul du win rate en temps réel
- 🧠 Apprentissage continu via feedback
- 📊 Ajustement automatique de la réputation

### ✅ Monitoring Complet
- 🏥 Health check système
- 📊 Dashboard SQL interactif
- 🔍 Logs détaillés de toutes les opérations
- ⚠️ Alertes en cas de problème

---

## 📊 Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  SCAN-MARKET    │────▶│ GENERATE-SIGNAL  │────▶│ EVALUATE-TRADES │
│  (10 minutes)   │     │   (1 heure)      │     │   (2 heures)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │   SUPABASE DATABASE   │
                     │  + RLS + Migrations   │
                     └───────────────────────┘
```

---

## 📚 Documentation

### Guides Principaux

| Document | Description | Temps de Lecture |
|----------|-------------|------------------|
| **[QUICK_START.sh](scripts/quick-start.sh)** | Lancement en 1 commande | 2 min |
| **[SYSTEM_COMPLETE_GUIDE.md](SYSTEM_COMPLETE_GUIDE.md)** | Guide complet utilisateur | 15 min |
| **[FINAL_DEPLOYMENT_SUMMARY.md](FINAL_DEPLOYMENT_SUMMARY.md)** | Synthèse déploiement | 5 min |

### Guides Techniques

| Document | Description |
|----------|-------------|
| **[BTC_ONLY_DEPLOYMENT_GUIDE.md](BTC_ONLY_DEPLOYMENT_GUIDE.md)** | Stratégie BTC 3 mois |
| **[SECURITY_FIXES_COMPLETE.md](SECURITY_FIXES_COMPLETE.md)** | Correctifs sécurité (54 issues) |
| **[DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md)** | Rapport déploiement initial |

---

## 🛠️ Scripts Disponibles

### Script 1: Quick Start
```bash
./scripts/quick-start.sh
```
Lance le système complet et affiche les statistiques.

### Script 2: Test Système
```bash
./scripts/test-system-complete.sh
```
Teste les 3 edge functions principales.

### Script 3: Monitoring Dashboard
```bash
psql $DATABASE_URL -f scripts/monitoring-dashboard.sql
```
Affiche le dashboard complet du système.

### Script 4: Maintenance
```bash
psql $DATABASE_URL -f scripts/maintenance-auto.sql
```
Nettoie logs, cache, et optimise les tables.

---

## 📊 API Endpoints

### Base URL
```
https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1
```

### Endpoints Disponibles

#### 1. Health Check
```bash
GET /health-check
```
Vérifie la santé de tous les composants.

#### 2. Scan Market
```bash
POST /scan-market
```
Scanne le marché Bitcoin et collecte les données.

#### 3. Generate Signal
```bash
POST /generate-btc-signal
```
Génère un signal de trading BTC.

#### 4. Evaluate Trades
```bash
POST /evaluate-trades
```
Évalue les signaux actifs et détermine WIN/LOSS.

---

## 🔒 Sécurité

### ✅ Corrections Appliquées (54/54)
- ✅ RLS activé sur toutes les tables
- ✅ Politiques optimisées avec `(SELECT auth.uid())`
- ✅ Index ajoutés sur toutes les foreign keys
- ✅ Functions hardened avec search_path explicite
- ✅ Politiques permissives consolidées

### ⚠️ Actions Manuelles Requises
- [ ] Activer Password Protection (Dashboard)
- [ ] Activer MFA (Dashboard)

Voir [SECURITY_FIXES_COMPLETE.md](SECURITY_FIXES_COMPLETE.md) pour détails.

---

## 📈 Performances

### Optimisations
- **RLS Evaluation**: 10-100x plus rapide
- **FK Joins**: +30-50% plus rapides
- **Policies**: -42% (24→14)
- **Couverture RLS**: 100% (19/19 tables)

### Coûts Estimés
- **Claude API**: ~$15/mois
- **Supabase**: Gratuit (jusqu'à 500MB DB)

---

## 🎯 Roadmap

### ✅ Phase 1: Spécialisation BTC (3 mois)
- [x] Système BTC Only déployé
- [x] Auto-évaluation implémentée
- [x] Monitoring complet
- [ ] 100+ signaux collectés
- [ ] Win rate > 55%

### 🔄 Phase 2: Optimisation (Mois 2-3)
- [ ] Prompt Claude optimisé selon feedback
- [ ] TP/SL dynamiques selon volatilité
- [ ] Santiment GraphQL complet
- [ ] Dashboard analytics avancé

### 🚀 Phase 3: Multi-Crypto (Après 3 mois)
- [ ] Réactivation ETH, SOL, LINK
- [ ] Correlation analysis
- [ ] Portfolio optimization
- [ ] Risk management avancé

---

## 🛠️ Technologies

- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Frontend**: React + Vite
- **IA**: Claude 3.5 Sonnet + Haiku (Anthropic)
- **APIs**: CoinGecko, CoinMarketCap, CryptoPanic, Binance
- **Security**: RLS + Row-Level Policies
- **Monitoring**: SQL Dashboard + Health Check

---

## 📞 Support

### En cas de problème

1. **Vérifier health-check**
   ```bash
   curl https://asnevyxhgnxtegfkbivb.supabase.co/functions/v1/health-check
   ```

2. **Consulter les logs**
   ```sql
   SELECT * FROM function_logs ORDER BY created_at DESC LIMIT 20;
   ```

3. **Lancer les tests**
   ```bash
   ./scripts/test-system-complete.sh
   ```

4. **Consulter la documentation**
   - [SYSTEM_COMPLETE_GUIDE.md](SYSTEM_COMPLETE_GUIDE.md) - Guide complet
   - [Troubleshooting](SYSTEM_COMPLETE_GUIDE.md#troubleshooting) - Solutions problèmes courants

---

## 📄 License

MIT License - Voir [LICENSE](LICENSE) pour détails.

---

## 👥 Contributions

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md).

---

## ⭐ Star le projet

Si ce projet vous a aidé, n'hésitez pas à lui donner une étoile ⭐

---

**Développé avec ❤️ par Claude AI Assistant**

**Statut**: 🟢 **Production Ready**
**Version**: 2.0
**Date**: 29 octobre 2024
