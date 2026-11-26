# Culinary Academy V2 — release candidate runbook

Status: development candidate, NOT approved for deployment or commercial use.
Baseline: d16ef587a651cdfd902fd3065f072b3bffb90349.
Branch: v2-admin-development. Original main, original database and original Stripe webhook are out of scope.

## Evidence recorded
- Workflow 45852503936: application, disposable PostgreSQL and mocked desktop/mobile browser jobs passed.
- Workflow 45852706858: application and database passed; browser pending at review.
- Earlier separate V2 sandbox: registration, test checkout, active entitlement, lesson completion and immediate cancellation verified.
- These results do not prove real media storage, production security, or full real student-to-certificate integration.

## Gate A: engineering (before requesting deployment)
- [ ] All jobs green on exact candidate SHA; record run URL.
- [ ] Verify actual service_role grants, supervisor assignment locking, revoked permissions, cancellation/attachment races.
- [ ] Verify cleanup candidate age, path identity, attached exclusion, deletion response and retries. Keep ACADEMY_ENABLE_EVIDENCE_CLEANUP unset/false until real storage tests and retention review.
- [ ] Verify certificate eligibility and issuance concurrency; check REST pagination and complete module coverage.
- [ ] Verify lesson import preview against existing titles; preserve lesson IDs and progress; approve content separately.
- [ ] Review all 50 draft lessons with qualified culinary/food safety reviewer.
- [ ] Record unresolved issues, owners and evidence. No self-approval of unresolved high-risk findings.

## Gate B: isolated test deployment (explicit owner approval)
Target only Culinary Academy V2 Test, Supabase project wltgzehmwwxsmtquuyzl, Netlify culinary-academy-v2-test. Confirm project identifiers and branch before any mutation. Stripe remains test mode.
1. Confirm Netlify credits and test environment access. Do not purchase credits automatically.
2. Record current published deploy ID, Git SHA, migration history and counts of accounts, subscriptions, progress, attempts and certificates. No secrets or personal records in public Git.
3. Obtain a recoverable backup and rehearse restore in disposable environment. If unavailable, stop before migration.
4. Compare hosted migration history with staged SQL; reconcile differences explicitly. Never blindly replay baseline or reset hosted database.
5. Apply only reviewed pending migrations, verify grants and preservation counts, then publish exact approved SHA.
6. Run sandbox smoke tests. Stop on unexpected changes, failed migration, missing entitlement or cross-user access.
7. Rollback application to recorded deploy only if compatible with migrated schema. Database recovery requires separately reviewed plan; avoid destructive down migrations. Preserve new records and reconcile Stripe test state.

## Gate C: acceptance test script (separate synthetic student and supervisor)
| Scenario | Expected result |
|---|---|
| Register, confirm email, reset password | Account accessible only to owner |
| Unpaid account | Lessons locked |
| Test checkout and webhook | Active access; no duplicate subscription |
| Complete lesson and refresh | Progress persists |
| Load approved structured lesson | Correct content, drafts hidden |
| Submit practical and attach JPEG/MP4 | Private evidence, size/type enforced |
| Interrupt, retry, cancel upload | Recovery works; cancelled file cannot attach |
| Other student accesses evidence | Denied |
| Supervisor with MFA and allocation | Assigned work only; rubric recorded |
| Reassign/revoke supervisor | New access denied to former supervisor |
| Theory score below 80 then at least 80 | Fail then pass; history preserved |
| Missing practical or lesson | Certificate denied |
| All requirements met | PDF issued once; public verification omits personal data |
| Cancel membership | Access follows paid period; existing certificate downloadable |
| Cleanup in isolated test with synthetic cancelled file | Only eligible object removed; attached evidence preserved |
| Mobile, keyboard and accessibility | Usable without horizontal overflow or inaccessible controls |

Record pass/fail, timestamp, candidate SHA, anonymised evidence and defect ID. Repeat failed scenarios after fixes. Do not use real customer records.

## Gate D: commercial approval
Private repository and rotate exposed assessment bank; complete legal trader details, support email, domain, age policy, privacy retention, tax and consumer subscription review; implement durable terms acceptance and required notices; verify monitoring, recovery and payment failure paths. Obtain separate approval for live Stripe and production environment. No accreditation claims before approval by an accreditor. Revisit Institute of Hospitality endorsement, CPD and approved qualification partner routes after build acceptance; verify current criteria and costs before applying.
