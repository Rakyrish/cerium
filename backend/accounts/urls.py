"""Routes for the admin identity service.

Everything here lives under /api/admin/ and is reachable only on the container
network — Caddy publishes no path that reaches it.
"""

from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    # The exact path src/lib/auth.ts posts to. The trailing slash matters:
    # Django would answer a slashless request with a 301, and a redirected POST
    # loses its body.
    path("auth/verify/", views.verify, name="verify"),
]
