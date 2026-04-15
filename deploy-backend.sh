#!/usr/bin/env bash
# Fantasy Draft Pros — Backend Deploy Script
# Run once after filling in .env
# Usage: bash deploy-backend.sh

set -e

PROJECT_REF="wizdxspglxpvvogiivsv"

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill in all values."
  exit 1
fi

source .env

echo "==> Logging in to Supabase..."
npx supabase login

echo "==> Linking project..."
npx supabase link --project-ref $PROJECT_REF

echo "==> Running DB migration..."
npx supabase db push

echo "==> Deploying Edge Functions..."
npx supabase functions deploy analyze-trade
npx supabase functions deploy create-checkout
npx supabase functions deploy stripe-webhook
npx supabase functions deploy send-email

echo "==> Setting secrets..."
npx supabase secrets set \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  STRIPE_PRICE_PRO_MONTHLY="$STRIPE_PRICE_PRO_MONTHLY" \
  STRIPE_PRICE_PRO_YEARLY="$STRIPE_PRICE_PRO_YEARLY" \
  STRIPE_PRICE_ELITE_MONTHLY="$STRIPE_PRICE_ELITE_MONTHLY" \
  RESEND_API_KEY="$RESEND_API_KEY" \
  SITE_URL="$SITE_URL"

echo ""
echo "✓ Done! Edge Functions deployed and secrets set."
echo ""
echo "Next: Set your Stripe webhook endpoint in the Stripe Dashboard:"
echo "  URL: https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook"
echo "  Events: checkout.session.completed, customer.subscription.updated,"
echo "          customer.subscription.deleted, invoice.payment_failed"
