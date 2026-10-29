# Security and limitations

## Implemented controls
Invite-only signup, password validation, case-insensitive unique username constraint, non-admin signup roles, hashed expiring single-use invite tokens, CSRF protection, secure production session cookies, HTTPS, production DEBUG off, member-only reviews/profiles/images/social APIs, owner-only edits/deletes, shared-cache request limits and validated/re-encoded profile images.

Follows and reactions have uniqueness constraints. Comment/reply writes derive ownership from the session, not a submitted user ID. Input is rendered as plain React text. Reply targets are checked against their review.

GitHub dependency graph, Dependabot alerts/security updates, secret scanning and push protection were enabled on 28 October. This is not automatic merging.

## Outstanding or needing a fresh check
- BOOTSTRAP_ADMIN_PASSWORD was still present, masked, in Render on the last confirmed environment-screen check. Removal was planned but NOT confirmed. Existing admin setup does not need it on subsequent starts. Never claim it has been removed without verifying.
- GitHub and Render 2FA setup was not completed in the recorded session; requires the user to authenticate with their own phone/app. Do not collect OTPs or passwords in notes/chat.
- Free Render PostgreSQL was documented to expire after 30 days with no backups. Confirm actual expiry in the dashboard and export data or change hosting before relying on permanent persistence.
- Password reset/email verification, account-backed collections and wishlists, and broader moderation/reporting are future work.
- Existing rate limits use the direct network peer; Render proxy addresses may group users. Revisit carefully rather than trusting arbitrary forwarded IP headers.

## Audit boundary
A standard Codex Security source audit completed at commit `5e8cd73`, with zero confirmed reportable findings. It predates profiles, images, follows, reactions, comments and replies. Do not claim that audit covers these newer features or guarantees security.

Separate local Git history checks found no confirmed live credential leaks in scanned text. Those checks were limited and do not prove all secrets are absent.

Audit ID: `661f8a69-fc95-4578-89ae-6cacb22a847d` (completed; do not re-finalize).

Do not put runtime secrets, invite codes, account emails or database contents in Git or this notebook. A public source repository does not grant visitors database access, but secrets and permissions must remain protected.
