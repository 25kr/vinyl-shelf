# Local Django backend

This is the first backend milestone: a Django project, a local SQLite database,
a custom user model and a read-only health check. Real login, signup, shared
collections, reviews and private-beta deployment are not implemented yet.
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
