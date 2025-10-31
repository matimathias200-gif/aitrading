# 📑 INDEX DES FICHIERS - BTC ONLY SYSTÈME

## 🚀 DÉMARRAGE RAPIDE

| Fichier | Description | Action |
|---------|-------------|--------|
| **[README.md](README.md)** | Vue d'ensemble du projet | **COMMENCER ICI** |
| **[scripts/quick-start.sh](scripts/quick-start.sh)** | Lancer tout le système | `./scripts/quick-start.sh` |

---

## 📚 DOCUMENTATION PRINCIPALE

### Pour Commencer
- **[README.md](README.md)** - Vue d'ensemble + Quick Start
- **[FINAL_DEPLOYMENT_SUMMARY.md](FINAL_DEPLOYMENT_SUMMARY.md)** - Synthèse complète du déploiement
- **[SYSTEM_COMPLETE_GUIDE.md](SYSTEM_COMPLETE_GUIDE.md)** - Guide utilisateur complet

### Documentation Technique
- **[README_OPTIMISATION.md](README_OPTIMISATION.md)** - ⭐ **V3.0 - Backtest + Risk + Streaming** ⭐
- **[V3_FEATURES_SUMMARY.md](V3_FEATURES_SUMMARY.md)** - Synthèse fonctionnalités V3.0
- **[QUICK_START_V3.md](QUICK_START_V3.md)** - Démarrage rapide V3.0
- **[SYSTEM_V2_UPGRADE_GUIDE.md](SYSTEM_V2_UPGRADE_GUIDE.md)** - Guide upgrade V2
- **[BTC_ONLY_DEPLOYMENT_GUIDE.md](BTC_ONLY_DEPLOYMENT_GUIDE.md)** - Stratégie spécialisation BTC (3 mois)
- **[DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md)** - Rapport déploiement initial
- **[SECURITY_FIXES_COMPLETE.md](SECURITY_FIXES_COMPLETE.md)** - Détail des 54 correctifs sécurité

### Documentation Historique
- **[AUDIT_REPORT.md](AUDIT_REPORT.md)** - Audit initial
- **[MIGRATION_LOG.md](MIGRATION_LOG.md)** - Log des migrations
- **[CORRECTIONS_SUMMARY.md](CORRECTIONS_SUMMARY.md)** - Résumé corrections
- **[TECHNICAL_NOTES.md](TECHNICAL_NOTES.md)** - Notes techniques

---

## 🤖 SCRIPTS D'AUTOMATISATION

### Scripts Bash
| Script | Description | Commande |
|--------|-------------|----------|
| **[quick-start.sh](scripts/quick-start.sh)** | Lance tout le système | `./scripts/quick-start.sh` |
| **[test-system-complete.sh](scripts/test-system-complete.sh)** | Test complet (3 fonctions) | `./scripts/test-system-complete.sh` |

### Scripts SQL
| Script | Description | Commande |
|--------|-------------|----------|
| **[monitoring-dashboard.sql](scripts/monitoring-dashboard.sql)** | Dashboard monitoring | `psql $DB -f scripts/monitoring-dashboard.sql` |
| **[maintenance-auto.sql](scripts/maintenance-auto.sql)** | Maintenance quotidienne | `psql $DB -f scripts/maintenance-auto.sql` |

---

## ⚡ EDGE FUNCTIONS

### Fonctions V3.0 (NEW)
| Fonction | Fichier | Modèle | Fréquence |
|----------|---------|--------|-----------|
| **backtest-signals** ⭐ | [supabase/functions/backtest-signals/index.ts](supabase/functions/backtest-signals/index.ts) | Logic Only | 2 jours |
| **update-risk-parameters** ⭐ | [supabase/functions/update-risk-parameters/index.ts](supabase/functions/update-risk-parameters/index.ts) | Logic Only | 6 heures |
| **system-audit** ⭐ | [supabase/functions/system-audit/index.ts](supabase/functions/system-audit/index.ts) | Logic Only | 6 heures |

### Fonctions Déployées (V1/V2)
| Fonction | Fichier | Modèle Claude | Fréquence |
|----------|---------|---------------|-----------|
| **scan-market** | [supabase/functions/scan-market/index.ts](supabase/functions/scan-market/index.ts) | Haiku | 10 min |
| **generate-btc-signal** | [supabase/functions/generate-btc-signal/index.ts](supabase/functions/generate-btc-signal/index.ts) | Sonnet 3.5 | 1 heure |
| **evaluate-trades** | [supabase/functions/evaluate-trades/index.ts](supabase/functions/evaluate-trades/index.ts) | N/A | 2 heures |
| **health-check** | [supabase/functions/health-check/index.ts](supabase/functions/health-check/index.ts) | N/A | On-demand |

---

## 🗄️ MIGRATIONS SQL

### Migrations Appliquées
| Migration | Fichier | Description |
|-----------|---------|-------------|
| Schema initial | [20251026164331_create_crypto_trading_schema.sql](supabase/migrations/20251026164331_create_crypto_trading_schema.sql) | Tables principales |
| User settings | [20251026164654_create_user_settings_trigger.sql](supabase/migrations/20251026164654_create_user_settings_trigger.sql) | Triggers utilisateur |
| API cache | [20251026202703_update_api_cache_and_tables.sql](supabase/migrations/20251026202703_update_api_cache_and_tables.sql) | Optimisation cache |
| Function logs | [20251028174820_create_function_logs_table.sql](supabase/migrations/20251028174820_create_function_logs_table.sql) | Traçabilité |
| Evaluated_at | [20251028174859_add_evaluated_at_to_crypto_signals.sql](supabase/migrations/20251028174859_add_evaluated_at_to_crypto_signals.sql) | Auto-évaluation |
| **Security fixes** | [20251029003544_fix_all_security_issues_complete.sql](supabase/migrations/20251029003544_fix_all_security_issues_complete.sql) | **54 correctifs** |

---

## 🎨 FRONTEND

### React Components
| Composant | Fichier | Description |
|-----------|---------|-------------|
| App | [src/App.jsx](src/App.jsx) | Application principale |
| Dashboard | [src/components/Dashboard.jsx](src/components/Dashboard.jsx) | Dashboard utilisateur |
| SignalList | [src/components/SignalList.jsx](src/components/SignalList.jsx) | Liste des signaux |
| PerformanceChart | [src/components/PerformanceChart.jsx](src/components/PerformanceChart.jsx) | Graphiques performance |

### Contexts & Hooks
- [src/contexts/SupabaseAuthContext.jsx](src/contexts/SupabaseAuthContext.jsx) - Authentification
- [src/hooks/useSignals.js](src/hooks/useSignals.js) - Gestion signaux

---

## ⚙️ CONFIGURATION

| Fichier | Description |
|---------|-------------|
| **[package.json](package.json)** | Dépendances npm |
| **[vite.config.js](vite.config.js)** | Configuration Vite |
| **[tailwind.config.js](tailwind.config.js)** | Configuration Tailwind |
| **[.env](.env)** | Variables d'environnement |

---

## 📦 BUILD

| Fichier | Description |
|---------|-------------|
| **[dist/index.html](dist/index.html)** | HTML production |
| **dist/assets/** | CSS + JS compilés |

**Taille**: 917 KB (gzip: 272 KB)

---

## 🔍 NAVIGATION RAPIDE

### Par Cas d'Usage

**Je veux démarrer le système**
→ [scripts/quick-start.sh](scripts/quick-start.sh)

**Je veux comprendre le système**
→ [SYSTEM_COMPLETE_GUIDE.md](SYSTEM_COMPLETE_GUIDE.md)

**Je veux voir l'état du déploiement**
→ [FINAL_DEPLOYMENT_SUMMARY.md](FINAL_DEPLOYMENT_SUMMARY.md)

**Je veux corriger un problème**
→ [SYSTEM_COMPLETE_GUIDE.md#troubleshooting](SYSTEM_COMPLETE_GUIDE.md#troubleshooting)

**Je veux monitorer le système**
→ [scripts/monitoring-dashboard.sql](scripts/monitoring-dashboard.sql)

**Je veux comprendre la sécurité**
→ [SECURITY_FIXES_COMPLETE.md](SECURITY_FIXES_COMPLETE.md)

**Je veux modifier une fonction**
→ [supabase/functions/](supabase/functions/)

**Je veux comprendre la stratégie BTC**
→ [BTC_ONLY_DEPLOYMENT_GUIDE.md](BTC_ONLY_DEPLOYMENT_GUIDE.md)

---

## 📊 STATISTIQUES

- **Total fichiers**: 100+
- **Edge Functions**: 4
- **Migrations SQL**: 6
- **Scripts automatisation**: 4
- **Documents**: 8
- **React Components**: 25+
- **Lignes de code**: ~15,000

---

**Créé le**: 29 octobre 2024
**Version**: 2.0
**Statut**: 🟢 Production Ready
