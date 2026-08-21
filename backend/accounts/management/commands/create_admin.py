"""
Create or update an admin account.

This is the ONLY way an account comes into existence. There is no sign-up
route, no password-reset endpoint and no user-management screen in either
application, on purpose: Cerium has a handful of staff, and every additional
way in is another thing to secure for no operational gain.

    cd backend && .venv/bin/python manage.py create_admin
    docker compose run --rm backend python manage.py create_admin

Interactive by default so the password is never typed into a shell history or
baked into a CI log. `--password` exists for automation and says so.
"""

from __future__ import annotations

import getpass
import sys

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Create or update a Cerium admin account in Django's auth_user table."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--username", help="Login name. Prompted for if omitted.")
        parser.add_argument("--email", help="Contact address. Prompted for if omitted.")
        parser.add_argument(
            "--password",
            help=(
                "Skip the interactive prompt. Intended for automation only — the "
                "value lands in your shell history and in any CI log."
            ),
        )
        parser.add_argument(
            "--superuser",
            action="store_true",
            help='Grant full rights. Maps to role "admin" in the Next.js admin.',
        )
        parser.add_argument(
            "--update",
            action="store_true",
            help="Reset the password of an existing account instead of failing.",
        )

    def handle(self, *args, **options) -> None:
        username = (options.get("username") or "").strip()
        email = (options.get("email") or "").strip()
        password = options.get("password")

        interactive = sys.stdin.isatty()

        if not username:
            if not interactive:
                raise CommandError("--username is required when stdin is not a terminal.")
            username = input("Username: ").strip()
        if not username:
            raise CommandError("A username is required.")

        if not email:
            if interactive:
                email = input("Email: ").strip()
        if not email:
            raise CommandError(
                "An email is required — it is how someone signs in to /admin when "
                "they have forgotten which username they chose."
            )

        existing = User.objects.filter(username=username).first()
        if existing and not options["update"]:
            raise CommandError(
                f"{username!r} already exists. Re-run with --update to reset the "
                f"password, which is the only thing this command would change."
            )

        # Reject an email that already belongs to somebody else. The verify
        # endpoint resolves an email to exactly one account; two accounts
        # sharing one address makes which-one-you-get depend on primary key
        # order, which is not a thing anyone should have to reason about.
        clash = User.objects.filter(email__iexact=email).exclude(username=username).first()
        if clash:
            raise CommandError(
                f"{email!r} is already on account {clash.get_username()!r}. "
                f"One address, one account — the sign-in form accepts either "
                f"field and cannot choose between two."
            )

        if not password:
            if not interactive:
                raise CommandError("--password is required when stdin is not a terminal.")
            password = getpass.getpass("Password: ")
            confirm = getpass.getpass("Password (again): ")
            if password != confirm:
                raise CommandError("The two passwords did not match.")

        if not password:
            raise CommandError("A password is required.")

        # Run Django's configured validators — the same ones the admin's own
        # change-password form uses. A CLI that quietly accepts "password1"
        # while the web form refuses it is a hole with extra steps.
        candidate = existing or User(username=username, email=email)
        try:
            validate_password(password, user=candidate)
        except ValidationError as exc:
            raise CommandError("Password rejected:\n  - " + "\n  - ".join(exc.messages))

        with transaction.atomic():
            user = existing or User(username=username)
            user.email = email
            # is_staff is what the verify endpoint requires before it will
            # confirm any credential, so every account made here needs it.
            user.is_staff = True
            if options["superuser"]:
                user.is_superuser = True
            user.is_active = True
            user.set_password(password)
            user.save()

        action = "Updated" if existing else "Created"
        role = "admin" if user.is_superuser else "editor"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} {user.get_username()} <{user.email}> — role {role}.\n"
                f"The same credentials now work at /admin and /django-admin/."
            )
        )
