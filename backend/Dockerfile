# =============================================================================
# Cerium Chemicals — Django backend
# =============================================================================
# Single stage on purpose. The build produces no compiled asset bundle, so the
# multi-stage split that earns its keep in the Next.js image would only add a
# copy step here.

ARG PYTHON_VERSION=3.12-slim
FROM python:${PYTHON_VERSION}

# PYTHONUNBUFFERED so logs reach docker logs immediately rather than sitting in
# a buffer until the process exits — which is exactly when you need them.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# libpq for psycopg. curl for the compose healthcheck — the alternative is a
# Python one-liner that starts an interpreter on every probe.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Requirements first so a code change does not invalidate the dependency layer.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collected at build time so the running container needs no write access to the
# image. DJANGO_SECRET_KEY has no default and settings.py refuses to boot
# without one, so a throwaway is supplied for this step alone — it is never the
# key the container runs with.
RUN DJANGO_SECRET_KEY=build-only-not-a-runtime-key \
    DJANGO_DEBUG=False \
    python manage.py collectstatic --noinput

# Non-root. The app never writes to its own filesystem — uploads go straight to
# Cloudinary — so nothing here needs to be writable.
RUN useradd --system --create-home --uid 10001 django \
    && chown -R django:django /app
USER django

EXPOSE 8000

# Migrations are NOT run here, deliberately. Two replicas starting at once
# would race, and a mistyped env var would migrate the wrong database. They are
# a separate, explicit step — see CLAUDE.md.
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
