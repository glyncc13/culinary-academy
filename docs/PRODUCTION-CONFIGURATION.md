# Production configuration — planning only

## Proposed business details — 26 November 2026
- Trading name: Culinary Academy (proposed; legal identity not confirmed).
- Legal structure: undecided.
- General enquiries: info@culinaryacademy.co.uk (mailbox created; delivery verification pending).
- Support email: confirm designated mailbox before launch.
- Website domain: https://culinaryacademy.co.uk (registered; standalone coming-soon project; DNS/TLS verification pending).
- Minimum student age: undecided; age eligibility and children's privacy assessment required before launch.

Draft only. These unresolved details must be completed before publication or commercial launch. No deployment or live payment approval.

Do not remove the hardcoded test project/test Stripe guards. Create a separate production project and hosting site only with explicit approval. No real credentials in repository.
Required server variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server only), SITE_URL, STRIPE_SECRET_KEY (server only), STRIPE_MONTHLY_PRICE_ID, STRIPE_WEBHOOK_SECRET (server only). Verify actual supported key types. Never expose service or Stripe secrets to browser.
Before approval: private repository and replace public question bank; history secret scan; enable MFA for owners and leaked password protection; verified email delivery; least privilege; rate limits; CSP and headers; backup and restore; monitoring/incident plan; privacy retention schedule; terms acceptance evidence and contractual notices; tax review; accessibility; payment retry, concurrency and webhook ordering tests; real video and certificate tests.
Known open findings: public answer keys, checkout minute-boundary race, webhook ordering race, unverified MFA revocation, REST pagination limits, non-atomic admin audit, privacy request case management, certificate eligibility race, no enforced legal acceptance or reminder emails. Do not approve live launch until resolved or explicitly risk-assessed.
Release procedure: review migration diff, rehearse disposable replay, back up production, apply approved migrations, verify grants, deploy approved commit, smoke test in sandbox, obtain separate written approval for live payments. Rollback: redeploy last known good build; restore database only using reviewed recovery plan; reconcile Stripe rather than replay blindly.

## Public domain cutover
Keep the coming-soon project separate from the V2 test site. Retain IONOS nameservers, MX, SPF, DKIM, DMARC and autodiscover records. Verify both apex and www HTTPS in a signed-out browser and test the enquiry link and inbound/outbound mail. Before commercial cutover, approve a production deployment, record existing domain assignments and DNS values, configure production auth redirects and verified transactional sender, and test checkout return URLs in test mode. Move the domain only after acceptance and explicit approval; retain the coming-soon deployment for rollback. Never rename or redirect the existing test webhook endpoint during this procedure.
