# Temporary free Render beta

This deployment serves React and Django together on one HTTPS origin. The public
GitHub Pages preview remains separate. The landing page and catalogue are public;
reviews require a logged-in member, signup requires an unused invite, and only
the owner account 29kr is initialized as an admin. This is not an owner-only website.

## Before deploying

- Review render.yaml: web, PostgreSQL and key-value plans are explicitly free.
- Free PostgreSQL expires after 30 days and has no backups. Export anything you
  want to keep before expiry; do not use this for permanent data.
- The free web service sleeps when idle. Accounts and reviews live in PostgreSQL,
  not SQLite or the web container's temporary filesystem.
- Database and cache have empty public IP allowlists (private network only).
- Render generates DJANGO_SECRET_KEY. Never paste it into Git, chat or screenshots.
- Enter BOOTSTRAP_ADMIN_PASSWORD privately in Render for the first deployment.
  Use a unique strong password. It creates only 29kr and never resets an existing
  account or promotes a normal member. Remove the variable after initial setup.
- The initial server database is new. Your laptop's users/reviews are not uploaded.
  Keep the local SQLite file private; this deployment does not delete it.

## Deployment

Use the Render Blueprint for this GitHub repository, review all resource plans,
then deploy. The Docker image builds React with VITE_ENABLE_BACKEND=true, collects
admin static files, and runs migrations plus first-time owner setup on startup.
Free plans lack pre-deploy hooks and shell access, so migrations run at startup.
One service instance only; revisit migration orchestration before scaling.

Auto deploy is off. Choose Manual Deploy after intentionally pushing updates.
The production module requires PostgreSQL, Redis and explicit hostnames. It
enforces secure cookies, HTTPS, DEBUG=False and shared cache login/signup limits.
Short HSTS is enabled; browser preload is deliberately disabled for a temporary
beta. Django check --deploy therefore reports only the intentional W021 warning.
Render's HTTPS proxy must remain in front of this service. Rate limits use the
direct network peer rather than trusting user-supplied IP headers; shared proxy
addresses may conservatively group testers together. The free cache is volatile;
its restart can reset temporary attempt counters. This is not a security audit.

## Owner and invites

Log in as 29kr using the password entered privately in Render. Open admin, then
Invitations -> Add. Give it a label and expiry (default seven days). Save and copy
the one-time code from the success message; share it privately. Deleting an unused
invitation revokes it. Your friend opens the Render website, clicks Log in -> Have
an invite? Sign up, and enters their details and code. Signup never grants admin.

Verify signup, login/logout, member-only reviews, owner-only edit/delete, admin
restrictions, and persistence after a redeploy before inviting others. Email
verification, password reset and account-specific shelves are still future work.
Keep testers informed this is temporary and avoid collecting sensitive content.
