"""
Django settings for Cerium Chemicals.

---------------------------------------------------------------------------
ONE CONFIGURATION FILE, SHARED WITH THE NEXT.JS APP
---------------------------------------------------------------------------
Every value comes from the `.env` at the repository root — the same file the
frontend and docker-compose read. There is deliberately no `backend/.env`: two
configuration files for one deployment is how a domain, a database name or a
shared secret drifts apart between the halves that must agree on it.

In the container the values arrive as real environment variables (compose
`env_file`). For a local checkout we additionally read the root `.env` off
disk, so `manage.py` works without a wrapper script.
"""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()

# The repository root is the parent of `backend/`. Reading is best-effort: in
# the container the file is not copied in (secrets are passed as environment),
# and `read_env` on a missing path is a no-op rather than an error.
_root_env = BASE_DIR.parent / ".env"
if _root_env.exists():
    env.read_env(_root_env)


# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------

# No default, deliberately. A settings module that boots with a fallback key is
# one that eventually ships with it, and the failure is silent — sessions and
# password-reset tokens simply become forgeable. Missing key, no boot.
SECRET_KEY = env("DJANGO_SECRET_KEY")

DEBUG = env.bool("DJANGO_DEBUG", default=False)

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "backend"])

# Django 4+ requires the scheme here. Built from the public domain so it cannot
# drift from what Caddy actually serves.
_domain = env("CERIUM_DOMAIN", default="")
CSRF_TRUSTED_ORIGINS = [f"https://{_domain}", f"https://www.{_domain}"] if _domain else []

# Caddy terminates TLS and proxies plain HTTP inwards. Without this Django sees
# http:// and would redirect forever once SECURE_SSL_REDIRECT is on.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # HSTS is set at the proxy (see Caddyfile). Setting it in both places means
    # two sources of truth for a header that is painful to walk back.


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "accounts",
    "catalogue",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
# Django owns `cerium_production`. The Next.js app's Drizzle schema owns
# `cerium`. These must never be pointed at one database: each migration system
# believes it owns the table definitions and neither reads the other's history
# table, so whichever runs second happily drops or recreates the first's tables.

_django_db_url = env("DJANGO_DATABASE_URL", default="")

if _django_db_url:
    DATABASES = {"default": env.db_url_config(_django_db_url)}
else:
    # Assembled from the same parts docker-compose uses, so a missing
    # DJANGO_DATABASE_URL is not a separate configuration path to maintain.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DJANGO_DB", default="cerium_production"),
            "USER": env("POSTGRES_USER", default="cerium"),
            "PASSWORD": env("POSTGRES_PASSWORD", default=""),
            "HOST": env("POSTGRES_HOST", default="db"),
            "PORT": env.int("POSTGRES_PORT", default=5432),
            "CONN_MAX_AGE": 60,
        }
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
# Django's stock `auth_user` is the ONE identity store for both applications.
# The Next.js admin does not have a users table of its own; it posts credentials
# to /api/admin/auth/verify/ and trusts the answer. That is the whole point —
# one person, one username, one password, both admins.

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# The shared secret that proves a verification request came from our own
# Next.js server. Empty means the endpoint refuses every request (403) rather
# than serving as an open password oracle — see accounts/views.py.
ADMIN_AUTH_SERVICE_TOKEN = env("ADMIN_AUTH_SERVICE_TOKEN", default="")

# Throttle for the verify endpoint, per identifier+IP.
ADMIN_AUTH_MAX_ATTEMPTS = env.int("ADMIN_AUTH_MAX_ATTEMPTS", default=10)
ADMIN_AUTH_ATTEMPT_WINDOW = env.int("ADMIN_AUTH_ATTEMPT_WINDOW", default=300)

CACHES = {
    "default": {
        # MUST be shared across processes, because this cache is the only thing
        # holding the sign-in throttle.
        #
        # LocMemCache was wrong here and the mistake is worth recording: gunicorn
        # runs several workers, each gets its own memory, and the counter
        # therefore fragments. Measured with 3 workers and a limit of 10, twelve
        # consecutive bad passwords produced twelve 401s and never a 429 — the
        # effective limit was three times what was configured, and it would drift
        # further with every worker added.
        #
        # The database is already there, already shared, and a round trip per
        # login attempt costs nothing on a form a handful of staff use. Requires
        # the table:  manage.py createcachetable
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache_table",
    }
}


# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------

LANGUAGE_CODE = env("DJANGO_LANGUAGE_CODE", default="en-ke")
TIME_ZONE = env("DJANGO_TIME_ZONE", default="Africa/Nairobi")
USE_I18N = True
USE_TZ = True


# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
# Only the Django admin's own CSS/JS is served from here. The public site is
# the Next.js app and shares none of this.

STATIC_URL = "/django-static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}


# ---------------------------------------------------------------------------
# Third-party integrations
# ---------------------------------------------------------------------------
# Both are optional. Absent credentials must produce a clear error at the point
# of use, never a silent fallback — a catalogue that quietly stops uploading
# images, or quietly stops generating copy, is worse than one that says so.

CLOUDINARY_CLOUD_NAME = env("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", default="")
CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY", default="")
CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET", default="")
CLOUDINARY_FOLDER = env("CLOUDINARY_FOLDER", default="cerium")

OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
OPENAI_MODEL = env("OPENAI_MODEL", default="gpt-4o-mini")

# The canonical public origin, used when generated copy needs to reason about
# real URLs (internal linking suggestions).
SITE_URL = env("NEXT_PUBLIC_SITE_URL", default="")


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "[{levelname}] {name}: {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        # Failed credential verification is an operational signal worth keeping
        # at INFO even in production.
        "accounts.auth": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
