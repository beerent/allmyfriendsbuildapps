#!/usr/bin/env bash
set -euo pipefail

# StreamAds Firebase Setup Script
# Creates a Firebase project, web app, enables auth + storage,
# generates a service account key, and writes .env.local

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"
KEY_FILE="$PROJECT_ROOT/firebase-admin-key.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Prerequisites ──────────────────────────────────────────────

check_command() {
  command -v "$1" &>/dev/null || error "$1 is required but not installed. Install it first."
}

check_command firebase
check_command gcloud
check_command jq

# ── Step 1: Firebase Login ─────────────────────────────────────

info "Checking Firebase login status..."
if ! firebase login:list 2>/dev/null | grep -q "@"; then
  info "Not logged in. Opening browser for Firebase login..."
  firebase login
fi
info "Firebase login confirmed."

# ── Step 2: Project Selection / Creation ───────────────────────

echo ""
info "Available Firebase projects:"
firebase projects:list 2>/dev/null | head -20
echo ""

read -rp "Enter a Firebase project ID (or type 'new' to create one): " PROJECT_ID

if [[ "$PROJECT_ID" == "new" ]]; then
  read -rp "Enter a project ID (lowercase, hyphens ok): " PROJECT_ID
  read -rp "Enter a display name: " DISPLAY_NAME
  info "Creating Firebase project '$PROJECT_ID'..."
  firebase projects:create "$PROJECT_ID" --display-name "${DISPLAY_NAME:-$PROJECT_ID}"
fi

info "Setting active project to '$PROJECT_ID'..."
firebase use "$PROJECT_ID"

# Set gcloud project too
gcloud config set project "$PROJECT_ID" 2>/dev/null

# ── Step 3: Create Web App ─────────────────────────────────────

info "Checking for existing web apps..."
EXISTING_APP=$(firebase apps:list WEB --project "$PROJECT_ID" 2>/dev/null | grep -oE '[0-9]:[0-9]+:web:[a-f0-9]+' | head -1 || true)

if [[ -n "$EXISTING_APP" ]]; then
  APP_ID="$EXISTING_APP"
  info "Using existing web app: $APP_ID"
else
  info "Creating web app 'streamads-web'..."
  CREATE_OUTPUT=$(firebase apps:create WEB streamads-web --project "$PROJECT_ID" 2>&1)
  APP_ID=$(echo "$CREATE_OUTPUT" | grep -oE '[0-9]:[0-9]+:web:[a-f0-9]+' || true)
  if [[ -z "$APP_ID" ]]; then
    error "Failed to create web app. Output:\n$CREATE_OUTPUT"
  fi
  info "Created web app: $APP_ID"
fi

# ── Step 4: Get SDK Config ─────────────────────────────────────

info "Fetching SDK config..."
SDK_CONFIG=$(firebase apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" --json 2>/dev/null)

API_KEY=$(echo "$SDK_CONFIG" | jq -r '.result.sdkConfig.apiKey // empty')
AUTH_DOMAIN=$(echo "$SDK_CONFIG" | jq -r '.result.sdkConfig.authDomain // empty')
FB_PROJECT_ID=$(echo "$SDK_CONFIG" | jq -r '.result.sdkConfig.projectId // empty')
STORAGE_BUCKET=$(echo "$SDK_CONFIG" | jq -r '.result.sdkConfig.storageBucket // empty')

if [[ -z "$API_KEY" ]]; then
  error "Failed to extract SDK config. Raw output:\n$SDK_CONFIG"
fi

info "Got SDK config (apiKey: ${API_KEY:0:8}...)"

# ── Step 5: Enable Authentication ──────────────────────────────

info "Enabling Authentication service..."

# Enable Identity Platform API (required for auth)
gcloud services enable identitytoolkit.googleapis.com --project "$PROJECT_ID" 2>/dev/null || true

# Enable Google sign-in provider
info "Enabling Google sign-in provider..."
gcloud identity-platform config update \
  --project "$PROJECT_ID" \
  --enable-email-auth \
  2>/dev/null || warn "Could not enable email auth via gcloud. You may need to enable it manually in the Firebase console."

# Google provider requires OAuth consent screen — try to enable
gcloud identity-platform config update \
  --project "$PROJECT_ID" \
  --enable-providers=google.com \
  2>/dev/null || warn "Could not auto-enable Google sign-in. Enable it manually: Firebase Console → Authentication → Sign-in method → Google → Enable"

info "Authentication configured."

# ── Step 6: Enable Storage ─────────────────────────────────────

info "Enabling Cloud Storage..."
gcloud services enable firebasestorage.googleapis.com --project "$PROJECT_ID" 2>/dev/null || true
gcloud services enable storage.googleapis.com --project "$PROJECT_ID" 2>/dev/null || true

# Initialize storage rules if not already done
if [[ ! -f "$PROJECT_ROOT/storage.rules" ]]; then
  cat > "$PROJECT_ROOT/storage.rules" << 'RULES'
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /ad-images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
RULES
  info "Created storage.rules with ad-image upload rules."
fi

# Deploy storage rules
firebase deploy --only storage --project "$PROJECT_ID" 2>/dev/null || warn "Could not deploy storage rules. You may need to initialize storage in the Firebase console first."

# ── Step 7: Service Account Key ────────────────────────────────

info "Setting up service account for Admin SDK..."

# Find the firebase admin service account
SA_EMAIL=$(gcloud iam service-accounts list \
  --project "$PROJECT_ID" \
  --filter="email:firebase-adminsdk" \
  --format="value(email)" 2>/dev/null | head -1)

if [[ -z "$SA_EMAIL" ]]; then
  warn "No firebase-adminsdk service account found. Creating one..."
  SA_EMAIL="firebase-adminsdk@${PROJECT_ID}.iam.gserviceaccount.com"
  gcloud iam service-accounts create firebase-adminsdk \
    --display-name="Firebase Admin SDK" \
    --project="$PROJECT_ID" 2>/dev/null || true
  SA_EMAIL=$(gcloud iam service-accounts list \
    --project "$PROJECT_ID" \
    --filter="email:firebase-adminsdk" \
    --format="value(email)" 2>/dev/null | head -1)
fi

info "Service account: $SA_EMAIL"

if [[ -f "$KEY_FILE" ]]; then
  info "Service account key already exists at $KEY_FILE"
else
  info "Creating service account key..."
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SA_EMAIL" \
    --project="$PROJECT_ID"
  info "Key saved to $KEY_FILE"
fi

# Extract values from key file
ADMIN_PROJECT_ID=$(jq -r '.project_id' "$KEY_FILE")
ADMIN_CLIENT_EMAIL=$(jq -r '.client_email' "$KEY_FILE")
ADMIN_PRIVATE_KEY=$(jq -r '.private_key' "$KEY_FILE")

# ── Step 8: Write .env.local ───────────────────────────────────

info "Writing .env.local..."

cat > "$ENV_FILE" << ENVEOF
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamads

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=$API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$FB_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$STORAGE_BUCKET

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=$ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL=$ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY="$ADMIN_PRIVATE_KEY"
ENVEOF

info ".env.local written successfully."

# ── Step 9: Verify .gitignore ──────────────────────────────────

if ! grep -q "firebase-admin-key.json" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
  echo "firebase-admin-key.json" >> "$PROJECT_ROOT/.gitignore"
  info "Added firebase-admin-key.json to .gitignore"
fi

if ! grep -q "storage.rules" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
  echo "storage.rules" >> "$PROJECT_ROOT/.gitignore"
  info "Added storage.rules to .gitignore"
fi

# ── Done ───────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Firebase setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo "  Project:  $PROJECT_ID"
echo "  Web App:  $APP_ID"
echo "  Config:   $ENV_FILE"
echo "  SA Key:   $KEY_FILE"
echo ""
echo "  Next steps:"
echo "    1. Create the database:  createdb streamads"
echo "    2. Run migrations:       npx drizzle-kit generate && npx drizzle-kit migrate"
echo "    3. Seed system items:    npx tsx src/lib/db/seed.ts"
echo "    4. Start the app:        npm run dev"
echo ""
warn "If Google sign-in wasn't auto-enabled, enable it manually:"
echo "    Firebase Console → Authentication → Sign-in method → Google → Enable"
echo ""
