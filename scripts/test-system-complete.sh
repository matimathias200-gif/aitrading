#!/bin/bash
#
# SYSTÈME DE TEST COMPLET - BTC ONLY
# Teste toutes les fonctions et vérifie la santé du système
#

set -e

# Configuration
SUPABASE_URL="https://asnevyxhgnxtegfkbivb.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmV2eXhoZ254dGVnZmtiaXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTAzMDUsImV4cCI6MjA3NjI4NjMwNX0.iGTpsV-MBNWqlY-WikSWBlvSK5Gx0PGoZLufOikLHO8"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BTC ONLY - SYSTÈME DE TEST COMPLET   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour tester un endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_field=$3

    echo -ne "${YELLOW}Testing ${name}...${NC} "

    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/$endpoint" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        --max-time 60)

    if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        echo "$response" | jq -C '.' | head -20
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "$response" | jq -C '.'
        return 1
    fi
}

# Compteurs
TOTAL=0
PASSED=0
FAILED=0

# Test 1: scan-market
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 1: SCAN-MARKET${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
((TOTAL++))
if test_endpoint "scan-market" "scan-market" "success"; then
    ((PASSED++))
else
    ((FAILED++))
fi

sleep 5

# Test 2: generate-btc-signal
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 2: GENERATE-BTC-SIGNAL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
((TOTAL++))
if test_endpoint "generate-btc-signal" "generate-btc-signal" "success"; then
    ((PASSED++))
else
    ((FAILED++))
fi

sleep 3

# Test 3: evaluate-trades
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 3: EVALUATE-TRADES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
((TOTAL++))
if test_endpoint "evaluate-trades" "evaluate-trades" "success"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Résumé
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            RÉSUMÉ DES TESTS            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total: ${BLUE}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS SONT PASSÉS !${NC}"
    exit 0
else
    echo -e "${RED}❌ CERTAINS TESTS ONT ÉCHOUÉ${NC}"
    exit 1
fi
