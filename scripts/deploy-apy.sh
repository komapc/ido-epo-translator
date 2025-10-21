#!/bin/bash
# Deploy APy server to Google Cloud Run

set -e

# Configuration
PROJECT_ID="${FIREBASE_PROJECT_ID:-ido-epo-translator}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
SERVICE_NAME="ido-epo-apy"
VERSION="${1:-latest}"

echo "=== Deploying APy Server to Cloud Run ==="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Version: $VERSION"
echo ""

# Navigate to apy-server directory
cd "$(dirname "$0")/../apy-server"

# Copy latest local repos
echo "📦 Copying local Apertium repositories..."
rm -rf apertium-ido-local apertium-ido-epo-local

if [ -d "../../../apertium-ido" ]; then
    cp -r ../../../apertium-ido ./apertium-ido-local
    echo "✓ Copied apertium-ido"
else
    echo "⚠ apertium-ido not found, will clone from GitHub"
fi

if [ -d "../../../apertium-ido-epo" ]; then
    cp -r ../../../apertium-ido-epo ./apertium-ido-epo-local
    echo "✓ Copied apertium-ido-epo"
else
    echo "⚠ apertium-ido-epo not found, will clone from GitHub"
fi

echo ""

# Build Docker image
echo "🐳 Building Docker image..."
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME:$VERSION"
docker build -t "$IMAGE_NAME" .

echo ""
echo "✓ Docker image built: $IMAGE_NAME"
echo ""

# Push to Google Container Registry
echo "📤 Pushing to Google Container Registry..."
gcloud auth configure-docker --quiet
docker push "$IMAGE_NAME"

echo ""
echo "✓ Image pushed to GCR"
echo ""

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 2737 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 3 \
  --min-instances 0 \
  --project "$PROJECT_ID"

echo ""
echo "✅ Deployment complete!"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format="value(status.url)")

echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "Test the service:"
echo "  curl $SERVICE_URL/listPairs"
echo ""
echo "Update Firebase Functions config:"
echo "  firebase functions:config:set apy.server_url=\"$SERVICE_URL\""
echo ""

