# Commercial launch gate — NOT approved for live use

## Proposed business details — 26 November 2026
- Trading name: Culinary Academy (proposed; legal identity not confirmed).
- Legal structure: undecided.
- Support email: undecided.
- Website domain: undecided.
- Minimum student age: undecided; age eligibility and children's privacy assessment required before launch.

Draft only. These unresolved details must be completed before publication or commercial launch. No deployment or live payment approval.


## Draft membership terms (requires trader details and legal review)
Supplier: [legal name, trading address, registration details if applicable, support email]. Do not publish until completed.
Membership provides online culinary educational content, assessments and internal certificates; not regulated qualifications or proof of workplace competence. Follow your employer's food safety procedures.
Price: proposed £14.99 per month inclusive of applicable consumer taxes; renews monthly until cancelled. No minimum term beyond the billing period. Display exact total and renewal timing before checkout.
Cancel through Manage billing or contact [support email]. Ordinary cancellation stops future renewals; access continues to the paid period end unless statutory rights require otherwise. No cancellation fee.
Consumers ordinarily have a 14-day initial cancellation period. Do not impose a waiver or deny statutory remedies. Confirm cancellation/refund entitlement for the actual mix of digital content and services; obtain required separate express consent and durable confirmation before immediate supply where applicable. Provide a model cancellation form. Statutory rights remain unaffected.
Provide reasonable support for faulty or unavailable content; remedies under Consumer Rights Act 2015 remain unaffected. Do not promise accredited status. No blanket no-refunds clause.
Check commencement and final requirements of DMCCA subscription regime, renewal reminders, cooling-off notices and easy cancellation before launch. Send contract confirmation by email and retain terms version and affirmative acceptance. These checkout changes are not yet implemented.
Sources: https://www.legislation.gov.uk/uksi/2013/3134/part/3 ; https://www.legislation.gov.uk/ukpga/2024/13/contents ; https://www.legislation.gov.uk/ukdsi/2026/9780348287912/contents

## Draft privacy notice
Controller: [legal identity and contact]. Data: account/email, billing references, learning progress, assessment attempts, certificates, security logs, support requests and optional staff notes. Stripe processes payments; Supabase stores account/content data; Netlify hosts application. Confirm processor agreements, regions, international transfer safeguards and actual retention periods. Contract basis for service delivery, legal obligation for required accounting, legitimate interests subject to assessment for security; no marketing without suitable lawful basis. Explain rights, ICO complaint route, recipients, retention, transfers and any automated decision-making. Privacy request intake is not automatic deletion. Verify requester, assess exemptions, respond normally within one month, document decisions. Limit administrator notes to necessary non-sensitive data. Publish actual contact and retention schedule before launch. Cookie audit required; obtain consent for non-essential tracking before enabling it. 
ICO reference: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/

## Acceptance checklist (all pending unless evidenced)
- [ ] Replay all migrations on disposable database; back up and restore.
- [ ] Verify RLS and service-role grants; test anonymous, unpaid, paid, other-user and admin access.
- [ ] Verify MFA enrollment, login challenge, AAL1 denial for every admin endpoint, session expiry, lost-device recovery and revocation.
- [ ] Make repository private and replace exposed starter questions; scan history for secrets, rotate if needed.
- [ ] Verify leaked-password protection, rate limiting under concurrent requests, secure headers, dependency pinning, logs redaction and incident response.
- [ ] Test sign-up, confirmation, reset, sign-out, duplicate accounts, mobile and accessibility.
- [ ] Test checkout and portal in sandbox, duplicate/concurrent checkout, failed payments, renewal, cancellations, refunds, webhook retry and ordering, expiry and re-subscribe.
- [ ] Test course navigation, draft/published permissions, completion persistence, video upload type/size, expiring video links and other-user denial.
- [ ] Test assessment 60/80/100 scores, answer tampering, cross-user run denial, replay, expiry, question edits between load and submit, history preservation, concurrent submissions.
- [ ] Test certificate eligibility, download PDF, duplicate issuance, verification, revocation, name handling and cancelled-member downloads.
- [ ] Test administrator creation/editing, privacy requests and export scope, CSV injection, audit trail and pagination.
- [ ] Test privacy response workflow, secure export, erasure/retention decisions and backup deletion policy.
- [ ] Complete trader details, legal review, tax determination, terms acceptance evidence, cancellation form, durable confirmation, renewal notices, privacy notice and cookie audit.
- [ ] Validate budget, storage quotas, backups, monitoring, support contact, accessibility and performance.
- [ ] Obtain explicit launch approval; configure separate production environment; do not remove test guard until production security review.
