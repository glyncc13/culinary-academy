# Branded authentication emails — staged only

Five standalone HTML templates and a subject manifest for account confirmation, password recovery, invites, magic links and email changes. They preserve the Supabase-generated ConfirmationURL rather than constructing links or embedding tokens. No images, trackers, external dependencies or credentials.

Reference: https://supabase.com/docs/guides/auth/auth-email-templates

## Isolated acceptance procedure (requires deployment approval)

1. Export and preserve the existing template subjects/bodies and auth configuration in a restricted backup. Do not commit secrets.
2. Verify the isolated V2 project and approved sender; retain existing DNS and mail settings. Do not change the original project.
3. Configure the five corresponding templates using the subject manifest. Confirm the redirect allowlist matches the isolated test origin.
4. With synthetic controlled mailboxes, test signup, password reset, invite, magic link and email change (including both addresses if configured). Check rendering on desktop/mobile, spam placement, link expiry, repeated use, correct redirect, and that no tokens appear in logs.
5. Record delivery results and revert templates using the backup if acceptance fails.

These are authentication templates only. Membership confirmation, renewal notices, payment failure, practical assessment and certificate notifications need separately approved content and durable event delivery; no live email delivery has been configured. Do not send unsolicited messages or enable live payments.
