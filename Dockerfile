FROM node:24-bookworm-slim AS frontend
WORKDIR /frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN VITE_ENABLE_BACKEND=true npm run build

FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=config.settings.production
WORKDIR /app/backend
COPY backend/requirements*.txt ./
RUN pip install --no-cache-dir -r requirements-production.txt
COPY backend/manage.py ./
COPY backend/config ./config
COPY backend/accounts ./accounts
COPY backend/api ./api
COPY backend/reviews ./reviews
COPY --from=frontend /frontend/dist /app/dist
# Collect public admin assets without using any real credentials or database.
RUN DJANGO_SECRET_KEY=build-only-not-a-runtime-secret-key-0000000000000000000000000000 DJANGO_ALLOWED_HOSTS=build.invalid DATABASE_URL=postgresql://build:build@localhost/build REDIS_URL=redis://localhost:6379 python manage.py collectstatic --noinput
RUN useradd --create-home app && chown -R app:app /app
USER app
EXPOSE 10000
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py bootstrap_admin && exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-10000} --workers 2 --threads 2 --timeout 60 --forwarded-allow-ips='*' --access-logfile - --error-logfile -"]
