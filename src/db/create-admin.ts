/**
 * Retired. Accounts are created in Django now.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS SCRIPT NO LONGER DOES ANYTHING
 * ---------------------------------------------------------------------------
 * It used to write a bcrypt hash into the Drizzle `users` table, which was the
 * Next.js admin's own identity store. Django kept a separate `auth_user` in a
 * separate database. One person therefore had two accounts and two passwords,
 * and deactivating one of them left the other working — which is the failure
 * that matters, because deactivating someone is exactly when a second copy is
 * unaffordable.
 *
 * Django is the backend of record, so `auth_user` is now the only identity
 * store. `/admin` here and `/django-admin/` there verify the same row.
 *
 * The file is kept rather than deleted so that anyone who runs the old command
 * — from memory, a script, or a runbook — gets this explanation instead of
 * silently creating a second account that appears to work and then does not.
 */

const MESSAGE = `
This command has been retired.

Admin accounts are created in Django, which is now the only identity store.
The same credentials work at /admin and at /django-admin/.

  cd backend
  .venv/bin/python manage.py create_admin

Add --superuser to grant the 'admin' role rather than 'editor'.

Creating an account here would create a SECOND one that the sign-in page no
longer reads — see src/lib/auth.ts.
`;

console.error(MESSAGE.trim());
process.exit(1);
