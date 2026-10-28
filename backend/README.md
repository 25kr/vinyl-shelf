# Local Django backend

This is the first backend milestone: a Django project, a local SQLite database,
a custom user model, a read-only health check and session login/logout connected
to the local React form. Account-owned reviews now use the Django database.
Signup, shared collections/wishlists and private-beta
deployment are not implemented yet.
The React site's existing browser data is not imported or modified.

## Run on this Windows laptop

From the project root, in one terminal:

    npm.cmd run backend

In a second terminal:

    npm.cmd run dev

Django binds only to http://127.0.0.1:8000. Vite binds to localhost on its shown
port (normally http://127.0.0.1:5173). Both terminals must stay running.
No virtual-environment activation script is needed, avoiding the PowerShell
execution-policy problem.

Direct check: http://127.0.0.1:8000/api/health/
Frontend bridge: open the Vite address with /api/health/ appended. The JSON
should show status ok and database ok. The Vite proxy exists only during local
development; GitHub Pages does not run Python or provide this API.

## Install on a fresh Windows checkout

    py -m venv backend/.venv
    .\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
    .\backend\.venv\Scripts\python.exe backend/manage.py migrate

The default management-command settings are config.settings.local. The local
secret key is generated once into backend/.dev-secret-key. The key, virtual
environment, database, bytecode and local environment files are ignored by Git.
Do not upload them or use local settings for hosting.

## Checks

    npm.cmd run backend:check
    npm.cmd run backend:test

Tests use a separate temporary database and never create real accounts. Local users are created explicitly via backend:user. No administrator is created automatically; admin roles are granted only with the owner's approval.

## Files to learn first

- manage.py: entry point for Django commands.
- config/settings/base.py: shared settings; fails without an environment secret.
- config/settings/local.py: settings for learning on this laptop.
- config/urls.py and api/urls.py: map addresses to Python views.
- api/views.py: returns the health-check JSON.
- accounts/models.py: the user model, defined before the first migration.
- accounts/migrations/: versioned instructions for creating database tables.

ASGI/WSGI default to the base settings rather than enabling local debug mode on
an accidental deployment. Base settings alone are not a completed hosting setup.
Production hosting, account/ownership checks, invite-only access, login limits,
password reset, database backups and deployment checks are future milestones.
See ../docs/BACKEND_PLAN.md.

## Create your own local listener account

From the project root:

    npm.cmd run backend:user -- yourname

Replace yourname with the username you want. The terminal asks you to type and
confirm a password privately; it will not echo what you type. Do not paste your
password into chat. The command checks Django's password rules, hashes the
password and creates an ordinary user with no admin permissions. It refuses to
overwrite an existing username. No default credentials or public signup exist.

Open the local Vite site and click Log in. Username/password are checked by
Django, which stores the session in an HttpOnly cookie. A refresh restores the
session. Click your username to open account details and Log out. Collections and wishlists remain device-local. New reviews are account-owned and visible to signed-in members only.

## Authentication endpoints

- GET /api/auth/session/: public user fields (or null), plus a masked CSRF token.
- POST /api/auth/login/: JSON username/password; CSRF header and cookie required.
- POST /api/auth/logout/: invalidates the server session; CSRF required.

Responses are not cached. Passwords and session tokens are never placed in
localStorage. Wrong passwords, unknown names and inactive accounts share the
same error. State-changing GET requests are rejected. Django enforces origin
checks; the Vite proxy preserves the original Host rather than disabling CSRF.
The default public build keeps login in demo mode and makes no auth requests.
Only enable VITE_ENABLE_BACKEND=true for a build served with its own /api backend.

The current login limiter allows 20 attempts per five-minute window per remote
address using Django's local-process cache. This is a development guard, not a
completed production brute-force defence. Hosting needs a shared cache or gateway
limiter, a reviewed proxy/IP policy and deployment testing. Invite-only signup,
password reset and account deletion remain future work. Do not deploy local DEBUG
settings. Tests exercise CSRF/origin rejection, generic failures, persistence,
logout invalidation, request validation and rate limits.

## Account-owned reviews and local admin

New reviews on the local signed-in site are stored in Django, with the author
set from the authenticated session. The private member feed is paginated at 20
entries. Only the owner may change/delete a review through the API; even a
superuser uses this owner-only API. Moderation is a separate Django admin action.
Real reviews and their edit controls are removed from React when the user logs
out or switches accounts. Public GitHub Pages remains a device-only demo.

- GET/POST /api/reviews/: authenticated member feed / create a review.
- PATCH/DELETE /api/reviews/<uuid>/: owner-only changes, with CSRF protection.
- Invalid albums, wrong-album tracks, future dates, ratings outside 1-5 and text
  over 500 characters are rejected by Django, not only by React.
- clientId is unique per owner: retrying a save/import does not create a second
  copy. Conflicting content with the same import ID must be edited explicitly.

Older browser entries are not silently assigned to whichever account signs in.
After login, expand Reviews saved on this browser and choose Import review as
<username>. This opens the form to check the date/rating and upload explicitly.
Original browser JSON is kept unchanged, including on error. Older undated
album-page reviews remain a read-only archive; no listening dates are invented.
Never import another person's entries from a shared device.

The account menu shows Open admin to staff. It links to /admin/ through the local
Vite proxy; the direct backend address is http://127.0.0.1:8000/admin/. Use your
existing username and password. Staff permissions are never granted by a public
endpoint. Superuser access permits user administration and review moderation;
owner and import identifiers cannot be reassigned through the review admin.
This milestone does not make the app production-ready: invitations, moderation
policy, shared login throttling, hosting and backups still need completing.

The review validation snapshot is backend/reviews/catalogue.json. When changing
the album catalogue, update this snapshot from src/data/tracklists.json as well;
each album maps to its list of disc-number track identifiers. Keep existing IDs
stable so saved reviews retain their album/track relationships.
