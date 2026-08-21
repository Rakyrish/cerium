"""
Root URL configuration.

Two surfaces, and only two:

  /django-admin/          the editorial admin Cerium staff actually use
  /api/admin/auth/verify/ the credential oracle the Next.js admin calls

`/django-admin/` rather than `/admin/` because /admin belongs to the Next.js
app on the public domain, and having the two answer different things at the
same path is a trap for whoever is on call at 2am.

There is deliberately no public read API here yet. The frontend still reads its
catalogue through src/lib/content.ts; replacing that is the Phase 2.4C cutover
and it is not this change.
"""

from django.contrib import admin
from django.urls import include, path

from accounts import views as account_views

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/admin/", include("accounts.urls")),
    path("healthz", account_views.health, name="health"),
]

admin.site.site_header = "Cerium Chemicals"
admin.site.site_title = "Cerium Chemicals"
admin.site.index_title = "Catalogue administration"
