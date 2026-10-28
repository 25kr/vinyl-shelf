# Local Django backend

This is the first backend milestone: a Django project, a local SQLite database,
a custom user model, a read-only health check and session login/logout connected
to the local React form. Signup, shared collections/reviews and private-beta
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

The tests use a separate temporary test database. No real accounts have been
created. /admin/ uses Django's authentication but no superuser is set up yet.

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
session. Click your username to open account details and Log out. Collections,
wishlists and reviews are still device-local, not per-account or shared; a banner
states this when signed in. Do not use a shared browser as if those records were
private account data. Account-specific storage is a later milestone.

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
