# Culinary Academy — Stripe test-mode scaffold

**Status: starter implementation, NOT production-ready.** £14.99/month = GBP 1499 minor units. This package contains the existing Culinary Academy site, a billing panel, Supabase migration, and three Netlify Functions. It has NOT been deployed, executed against your Supabase project, or tested with Stripe. **Existing learning pages are NOT paywalled yet**; do not accept real subscribers until paid-content RLS and public sign-up are implemented and tested.

## Step 0 — prerequisite
Resolve the earlier `permission denied for table memberships` error and verify Owner sign-in. The existing app has **invitation-only** accounts and Supabase client authentication uses `persistSession:false`; a Stripe redirect requires signing in again on return. Public learner registration must be implemented separately before launch.

## Step 1 — SQL migration
In Supabase SQL Editor, run `sql/001_subscriptions.sql` once. This creates billing tables and row-level policies; it does not overwrite your Owner account. It inserts a disabled monthly plan (enabled=false) until Stripe setup is verified. If any errors occur, stop and share the exact message.

## Step 2 — Stripe test mode
In Stripe Dashboard, enable test mode and create a product named `Culinary Academy Membership`, with a **recurring GBP £14.99 / month** price. Copy the test price ID `price_...`. Do not use a live price ID or live secret key. In test mode configure the customer portal and cancellation settings.

## Step 3 — Netlify environment variables
Set these under Site configuration > Environment variables (functions scope), then redeploy:

- `STRIPE_SECRET_KEY` = Stripe **test** secret key `sk_test_...`
- `STRIPE_MONTHLY_PRICE_ID` = Stripe **test** recurring price ID `price_...`
- `STRIPE_WEBHOOK_SECRET` = webhook endpoint signing secret `whsec_...`
- `SUPABASE_URL` = `https://YOURPROJECT.supabase.co`
- `SUPABASE_ANON_KEY` = Supabase publishable/anon key for verifying signed-in users
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase **secret/service role** key (server-side only)
- `SITE_URL` = your exact `https://YOUR-SITE.netlify.app` origin

**Never** put Stripe secret, webhook secret or Supabase service-role key in `index.html`, client JavaScript or Git. Do not send them in chat.

## Step 4 — Deploy correctly
This project uses Netlify Functions and a `package.json` dependency. **Do not use Netlify Drop** for this package: deploy through a Git repository connected to Netlify (or use the Netlify CLI with dependency installation). Netlify build settings: publish directory `.`; functions directory `netlify/functions`; install dependencies with `npm install` / `npm ci` when lockfile is present. The static site still serves `index.html`.

## Step 5 — Stripe webhook
Create Stripe test webhook endpoint:
`https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`

Subscribe to `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Save its signing secret in `STRIPE_WEBHOOK_SECRET`. Redeploy. This implementation fetches current Stripe subscription state on each event and writes to Supabase; duplicate event IDs are recorded.

## Step 6 — Test
1. Sign into Culinary Academy using the existing account. Click `Subscribe — £14.99/month (test)`.
2. Complete Stripe **test** checkout using a Stripe test card from Stripe's documentation. No real charge occurs.
3. Sign in again after redirect (existing app does not persist auth). Click `Check membership` and verify `active` or `trialing` in Supabase `subscriptions`.
4. Test portal cancellation, webhook delivery/retries, declined payments, and renewal using Stripe test clocks as appropriate.
5. Confirm the database user ID matches the logged-in user and that one user cannot read another user's billing rows.

## Required work before public launch
- Implement public sign-up, confirmation and onboarding **without** automatically granting organisation Owner or Instructor roles.
- Migrate existing lesson/course RLS to enforce entitlements **server-side**; currently `has_paid_access(auth.uid())` is only a building block. Consider plan-to-content mappings, free previews, and authorised Owner overrides.
- Add subscription event reconciliation, concurrency/idempotency controls, monitoring, support workflow, and Stripe customer portal policy review.
- Decide and document UK VAT/tax treatment, consumer disclosures, cancellation rights, privacy policy, retention, and refund terms. Check Stripe/City & Guilds marketing restrictions.
- Test on the deployed Netlify site and Android PWA; avoid storing secrets in client-side code.

## Security and architecture notes
`subscriptions` and `billing_customers` permit only owner-row SELECT under RLS; browser clients cannot update them. Server functions verify Supabase auth tokens and use a server-only service-role key. Webhook verifies the Stripe signature before writing. `stripe_webhook_events` has no client grants. The legacy application's organisation-based RLS remains unchanged, and paid-course access is **not yet enforced**.
