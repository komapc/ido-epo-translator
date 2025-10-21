#!/bin/bash
# Test the application locally

set -e

echo "=== Testing Ido-Esperanto Translator Locally ==="
echo ""

# Check if APy server is running
echo "1. Checking APy server..."
if curl -f http://localhost:2737/listPairs > /dev/null 2>&1; then
    echo "✓ APy server is running"
else
    echo "❌ APy server is not running"
    echo "   Start it with: cd apy-server && docker-compose up -d"
    exit 1
fi

echo ""

# Test translation
echo "2. Testing translation (Ido to Esperanto)..."
RESULT=$(curl -s -X POST http://localhost:2737/translate \
    -d "q=Me amas vu" \
    -d "langpair=ido|epo")

if echo "$RESULT" | grep -q "translatedText"; then
    echo "✓ Translation successful"
    echo "   Result: $RESULT"
else
    echo "❌ Translation failed"
    echo "   Response: $RESULT"
    exit 1
fi

echo ""

# Test reverse translation
echo "3. Testing translation (Esperanto to Ido)..."
RESULT=$(curl -s -X POST http://localhost:2737/translate \
    -d "q=Mi amas vin" \
    -d "langpair=epo|ido")

if echo "$RESULT" | grep -q "translatedText"; then
    echo "✓ Translation successful"
    echo "   Result: $RESULT"
else
    echo "❌ Translation failed"
    echo "   Response: $RESULT"
    exit 1
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "Start the development server:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser"
echo ""

