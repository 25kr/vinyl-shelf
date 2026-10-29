# Running and deployment

## Locations
- Repository: `C:/Users/mk/Downloads/Coding for fun/vinyl-shelf`
- GitHub: https://github.com/25kr/vinyl-shelf
- Live beta: https://vinyl-shelf-beta.onrender.com/
- GitHub Pages preview: https://25kr.github.io/vinyl-shelf/

The Render beta has Django/accounts. The separate GitHub Pages preview is static and cannot host Django. Root README still contains older pre-backend statements; this notebook records the newer state.

## Local startup
From the repository, use two terminals:

```powershell
npm.cmd run dev
npm.cmd run backend
```

Use `npm.cmd` because PowerShell blocks `npm.ps1` under the existing script policy. Do not weaken the system execution policy just to run npm.

The backend virtual environment is `backend/.venv`. Standard local backend port is 8000. Vite's default port is 5173; isolated UI checks have used 5174. Check which process/port is actually running.

```powershell
npm.cmd run backend:test
npm.cmd run build
backend/.venv/Scripts/python.exe backend/manage.py migrate --noinput
backend/.venv/Scripts/python.exe backend/manage.py makemigrations --check --dry-run
```

Do not seed fake accounts or test comments in the live database. Use Django's test database or isolated browser mocks/databases.

## Render
Service name: `vinyl-shelf-beta`, ID `srv-dbgl1ifb9u1s738k0lp0`.
Dashboard: https://dashboard.render.com/web/srv-dbgl1ifb9u1s738k0lp0/deploys

Docker serves the built frontend and Django together. Render startup runs migrations, the initial admin bootstrap command, and Gunicorn. Frontend build enables backend integration. WhiteNoise serves assets.

Region was configured as Frankfurt. Web, PostgreSQL and Valkey were free plans. Website auto-deploy is off; Blueprint Auto Sync was turned off. These settings were last checked 28 October and should be verified when relevant.

After telling the user, commit/push, then choose Manual Deploy → Deploy latest commit. Confirm the expected commit, migration success, health checks and Live status. Keep tabs open. Do not expose environment secret values.

Production uses two independently generated Django key parts to satisfy key length requirements. Preserve both. Never remove DATABASE_URL or Redis configuration during routine deployment.

See also [[04 Security and Limitations]] and `docs/HOSTING.md`.
