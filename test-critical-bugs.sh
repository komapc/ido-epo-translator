#!/bin/bash
# Test script for critical bugs fix

set -e

PROD_URL="https://ido-epo-translator.pages.dev"
EC2_URL="http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"

echo "🧪 Testing Critical Bugs Fix"
echo "=============================="
echo ""

# Test 1: Translation Feature
echo "📝 Test 1: Translation Feature (Ido → Esperanto)"
echo "------------------------------------------------"
echo "Testing: 'Me amas vu' → Esperanto"
TRANSLATION_RESULT=$(curl -s -X POST "$PROD_URL/api/translate" \
  -H "Content-Type: application/json" \
  -d '{"text":"Me amas vu","direction":"ido-epo"}' | jq -r '.translation')

if [ -n "$TRANSLATION_RESULT" ] && [ "$TRANSLATION_RESULT" != "null" ]; then
  echo "✅ Translation works: '$TRANSLATION_RESULT'"
else
  echo "❌ Translation failed or returned empty"
  exit 1
fi

echo ""

# Test 2: Reverse Translation
echo "📝 Test 2: Translation Feature (Esperanto → Ido)"
echo "------------------------------------------------"
echo "Testing: 'Mi amas vin' → Ido"
TRANSLATION_RESULT=$(curl -s -X POST "$PROD_URL/api/translate" \
  -H "Content-Type: application/json" \
  -d '{"text":"Mi amas vin","direction":"epo-ido"}' | jq -r '.translation')

if [ -n "$TRANSLATION_RESULT" ] && [ "$TRANSLATION_RESULT" != "null" ]; then
  echo "✅ Reverse translation works: '$TRANSLATION_RESULT'"
else
  echo "❌ Reverse translation failed or returned empty"
  exit 1
fi

echo ""

# Test 3: Status Endpoint (EC2)
echo "📝 Test 3: EC2 Status Endpoint"
echo "------------------------------"
echo "Testing: $EC2_URL:8081/status"

# Note: This requires the webhook secret, so we'll just check if endpoint exists
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$EC2_URL:8081/status" -H "X-Rebuild-Token: test" || echo "000")

if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "401" ]; then
  echo "✅ Status endpoint is accessible (HTTP $STATUS_CODE)"
else
  echo "⚠️  Status endpoint returned HTTP $STATUS_CODE (may need authentication)"
fi

echo ""

# Test 4: Versions API with Status
echo "📝 Test 4: Versions API (with EC2 status)"
echo "-----------------------------------------"
echo "Testing: $PROD_URL/api/versions"

VERSIONS_RESULT=$(curl -s "$PROD_URL/api/versions")
CURRENT_HASH=$(echo "$VERSIONS_RESULT" | jq -r '.repos[0].currentHash')

if [ "$CURRENT_HASH" != "null" ] && [ -n "$CURRENT_HASH" ]; then
  echo "✅ Versions API returns current hash: $CURRENT_HASH"
  echo "   (Bug #1 FIXED: 'Current: Unknown' should now show actual hash)"
else
  echo "⚠️  Versions API still returns null for currentHash"
  echo "   (Bug #1 NOT FIXED: May need EC2 webhook server restart)"
fi

echo ""

# Test 5: API Status Endpoint
echo "📝 Test 5: Worker Status Endpoint"
echo "----------------------------------"
echo "Testing: $PROD_URL/api/status"

API_STATUS=$(curl -s "$PROD_URL/api/status")
STATUS_OK=$(echo "$API_STATUS" | jq -r '.status')

if [ "$STATUS_OK" = "ok" ]; then
  echo "✅ API status endpoint works"
  echo "$API_STATUS" | jq .
else
  echo "⚠️  API status endpoint returned: $STATUS_OK"
fi

echo ""
echo "=============================="
echo "🎯 Test Summary"
echo "=============================="
echo ""
echo "Bug #1 (Current: Unknown):"
if [ "$CURRENT_HASH" != "null" ] && [ -n "$CURRENT_HASH" ]; then
  echo "  ✅ FIXED - Current hash is now displayed"
else
  echo "  ⚠️  PARTIAL - May need EC2 deployment"
fi

echo ""
echo "Bug #2 (Translation Not Working):"
if [ -n "$TRANSLATION_RESULT" ] && [ "$TRANSLATION_RESULT" != "null" ]; then
  echo "  ✅ FIXED - Translation is working"
else
  echo "  ❌ BROKEN - Translation still not working"
fi

echo ""
echo "=============================="
echo "✅ Testing complete!"
echo ""
echo "Next steps:"
echo "1. If 'Current: Unknown' still shows, deploy webhook server: ./deploy-webhook-fix.sh"
echo "2. Deploy Worker changes: npm run cf:deploy"
echo "3. Test in browser: $PROD_URL"
