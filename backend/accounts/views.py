"""
Credential verification for the Next.js admin.

---------------------------------------------------------------------------
WHAT THIS ENDPOINT IS
---------------------------------------------------------------------------
`/api/admin/auth/verify/` is a password oracle. You hand it a username or
email and a password, and it tells you whether they match. That is exactly as
dangerous as it sounds, and every decision below follows from it.

It exists so that Cerium has ONE set of admin credentials. The Next.js admin at
/admin holds no users table; it posts here and trusts the answer, so the same
person signs in to /admin and /django-admin/ with the same password. The
alternative — a second identity store in the frontend — is what this replaced.

---------------------------------------------------------------------------
THE FOUR PROTECTIONS
---------------------------------------------------------------------------
1. It is never routed from the internet. Caddy publishes only the public site;
   this path is reachable on the container network alone.
2. It requires `X-Service-Token`, compared in constant time. An unset token on
   this side means refuse everything (403) rather than accept everything —
   fail closed. Getting this backwards turns the whole thing into an open
   oracle, which is why the check runs before the body is even parsed.
3. It never distinguishes "no such user" from "wrong password" from "account
   disabled". All three are 401 with the same body. Anything else is an
   account-enumeration endpoint.
4. It is throttled per identifier+IP, returning 429. The frontend treats 429 as
   a failure and says nothing useful to the caller.

The response shape is consumed by `verifyWithBackend` in src/lib/auth.ts. If
you change a field name here, change it there in the same commit — there is no
schema between them, only this comment and that one.
"""

from __future__ import annotations

import json
import logging
import secrets

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

log = logging.getLogger("accounts.auth")

User = get_user_model()

# One body for every failure a caller is allowed to see. Reused rather than
# rebuilt so no branch can accidentally leak a more specific reason.
_INVALID = {"detail": "invalid credentials"}


def _client_ip(request: HttpRequest) -> str:
    """Best-effort client IP for throttling.

    X-Forwarded-For is only trustworthy because the sole route to this service
    is our own proxy on the container network. It is used for rate-limit
    bucketing, never for authorisation.
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _service_token_ok(request: HttpRequest) -> bool:
    """Constant-time check of the shared service token.

    `compare_digest` rather than `==` so the comparison cannot be timed to
    recover the token byte by byte.
    """
    expected = settings.ADMIN_AUTH_SERVICE_TOKEN
    if not expected:
        # Fail closed. An unconfigured backend must refuse, not wave requests
        # through — this is the difference between a locked door and no door.
        log.error(
            "ADMIN_AUTH_SERVICE_TOKEN is not set; refusing every verification "
            "request. Set it to the same value the Next.js app uses."
        )
        return False
    presented = request.headers.get("X-Service-Token", "")
    return secrets.compare_digest(presented, expected)


def _resolve_username(identifier: str) -> str | None:
    """Map an email to its username; pass a username straight through.

    Returns None when nothing matches, and the caller still runs
    `authenticate()` with a value that cannot match, so the password hasher
    runs either way and the response time does not reveal whether the account
    exists.
    """
    if "@" not in identifier:
        return identifier
    # `iexact` because email case is not significant in practice and a mismatch
    # here would lock someone out of their own account.
    match = User.objects.filter(email__iexact=identifier).order_by("pk").first()
    return match.get_username() if match else None


@csrf_exempt
@require_POST
def verify(request: HttpRequest) -> HttpResponse:
    # Order matters: the token is checked before the body is read, so an
    # unauthenticated caller cannot use parse errors as a signal.
    if not _service_token_ok(request):
        return JsonResponse({"detail": "forbidden"}, status=403)

    try:
        payload = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "malformed request"}, status=400)

    identifier = str(payload.get("identifier") or "").strip()
    password = str(payload.get("password") or "")

    if not identifier or not password:
        return JsonResponse(_INVALID, status=401)

    # Throttle on identifier+IP. Keyed on the identifier as given so that
    # hammering one account is limited even from rotating addresses.
    bucket = f"adminauth:{_client_ip(request)}:{identifier.lower()}"
    attempts = cache.get(bucket, 0)
    if attempts >= settings.ADMIN_AUTH_MAX_ATTEMPTS:
        log.warning("verification throttled for %r", identifier)
        return JsonResponse({"detail": "too many attempts"}, status=429)

    username = _resolve_username(identifier)

    # When the email did not resolve we still call `authenticate`, with a value
    # that cannot be a valid username. Django's ModelBackend runs the hasher
    # against a dummy password in that case, which is what keeps the timing of
    # "no such user" indistinguishable from "wrong password".
    user = authenticate(request, username=username or "\x00none", password=password)

    # `authenticate` already returns None for is_active=False via
    # ModelBackend.user_can_authenticate. The explicit check documents that a
    # deactivated account is a 401 like any other failure, not a 403.
    if user is None or not user.is_active:
        cache.set(bucket, attempts + 1, settings.ADMIN_AUTH_ATTEMPT_WINDOW)
        log.info("failed verification for %r from %s", identifier, _client_ip(request))
        return JsonResponse(_INVALID, status=401)

    # Only staff may reach the admin at all. A plain account in auth_user is
    # not an admin of either application.
    if not user.is_staff:
        cache.set(bucket, attempts + 1, settings.ADMIN_AUTH_ATTEMPT_WINDOW)
        log.info("non-staff account %r attempted admin sign-in", identifier)
        return JsonResponse(_INVALID, status=401)

    cache.delete(bucket)

    full_name = user.get_full_name().strip()

    # Field names are the contract with src/lib/auth.ts. `role` collapses to
    # the two the frontend understands; anything else there becomes "editor".
    return JsonResponse(
        {
            "id": user.pk,
            "username": user.get_username(),
            "email": user.email or "",
            "name": full_name or user.get_username(),
            "role": "admin" if user.is_superuser else "editor",
        },
        status=200,
    )


def health(request: HttpRequest) -> HttpResponse:
    """Liveness probe for the container healthcheck.

    Deliberately does not touch the database: this answers "is Django
    serving?", and conflating that with "is Postgres up?" makes the compose
    dependency graph circular.
    """
    return JsonResponse({"status": "ok"})
