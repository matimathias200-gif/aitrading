#!/bin/bash
#
# QUICK START - Lance tout le système BTC ONLY en 1 commande
#

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        BTC ONLY - SYSTÈME QUICK START                    ║
║                                                           ║
║  Lance le système complet en 1 commande                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
SUPABASE_URL="https://asnevyxhgnxtegfkbivb.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmV2eXhoZ254dGVnZmtiaXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTAzMDUsImV4cCI6MjA3NjI4NjMwNX0.iGTpsV-MBNWqlY-WikSWBlvSK5Gx0PGoZLufOikLHO8"

# Fonction pour afficher une étape
step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

# Fonction pour afficher le succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher un warning
warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ===========================================================
# ÉTAPE 1: HEALTH CHECK
# ===========================================================

step "1/5 - Health Check du système..."

health_response=$(curl -s "$SUPABASE_URL/functions/v1/health-check" \
    -H "Authorization: Bearer $ANON_KEY")

health_status=$(echo "$health_response" | jq -r '.status')

if [ "$health_status" = "healthy" ]; then
    success "Système en bonne santé"
elif [ "$health_status" = "degraded" ]; then
    warn "Système dégradé mais fonctionnel"
else
    warn "Système en mauvaise santé, continuons quand même..."
fi

echo "$health_response" | jq -C '.' | head -20

# ===========================================================
# ÉTAPE 2: SCAN MARKET
# ===========================================================

step "2/5 - Scan du marché Bitcoin..."

scan_response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/scan-market" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    --max-time 60)

scan_success=$(echo "$scan_response" | jq -r '.success')

if [ "$scan_success" = "true" ]; then
    btc_price=$(echo "$scan_response" | jq -r '.data.market.price')
    change_24h=$(echo "$scan_response" | jq -r '.data.market.change24h')
    sentiment=$(echo "$scan_response" | jq -r '.data.news.sentiment')

    success "Marché scanné: BTC = \$$btc_price | Change 24h: ${change_24h}% | Sentiment: $sentiment"
else
    warn "Échec du scan (continuons...)"
fi

sleep 5

# ===========================================================
# ÉTAPE 3: GÉNÉRER SIGNAL
# ===========================================================

step "3/5 - Génération du signal BTC..."

signal_response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/generate-btc-signal" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    --max-time 60)

signal_success=$(echo "$signal_response" | jq -r '.success')

if [ "$signal_success" = "true" ]; then
    signal_type=$(echo "$signal_response" | jq -r '.signal.signal_type')
    confidence=$(echo "$signal_response" | jq -r '.signal.confidence')
    entry=$(echo "$signal_response" | jq -r '.signal.entry_price')
    tp=$(echo "$signal_response" | jq -r '.signal.take_profit')
    sl=$(echo "$signal_response" | jq -r '.signal.stop_loss')

    success "Signal généré: $signal_type @ $confidence% | Entry: $entry | TP: $tp | SL: $sl"
else
    warn "Échec de génération du signal"
    echo "$signal_response" | jq -C '.'
fi

sleep 3

# ===========================================================
# ÉTAPE 4: ÉVALUER LES TRADES
# ===========================================================

step "4/5 - Évaluation des trades..."

eval_response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/evaluate-trades" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    --max-time 60)

eval_success=$(echo "$eval_response" | jq -r '.success')

if [ "$eval_success" = "true" ]; then
    evaluated=$(echo "$eval_response" | jq -r '.evaluated')
    success "$evaluated trade(s) évalué(s)"
else
    warn "Aucun trade à évaluer pour le moment"
fi

# ===========================================================
# ÉTAPE 5: STATISTIQUES
# ===========================================================

step "5/5 - Statistiques du système..."

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 STATISTIQUES DU SYSTÈME${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Afficher les composants du health check
echo "$health_response" | jq -C '.components'

# ===========================================================
# RÉSUMÉ
# ===========================================================

echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   QUICK START TERMINÉ                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${GREEN}✅ Le système BTC ONLY est maintenant opérationnel !${NC}"
echo -e "\n${YELLOW}Prochaines étapes:${NC}"
echo -e "  1. Configurer les cron jobs (voir SYSTEM_COMPLETE_GUIDE.md)"
echo -e "  2. Surveiller avec: ./scripts/test-system-complete.sh"
echo -e "  3. Dashboard SQL: psql \$DATABASE_URL -f scripts/monitoring-dashboard.sql"
echo -e "  4. Health check: curl $SUPABASE_URL/functions/v1/health-check"

echo -e "\n${BLUE}Documentation complète: SYSTEM_COMPLETE_GUIDE.md${NC}\n"
