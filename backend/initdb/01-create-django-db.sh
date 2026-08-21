#!/bin/sh
# Create Django's database alongside the Drizzle one.
#
# The postgres image creates only POSTGRES_DB. Django owns a SEPARATE database
# because two migration systems must never be pointed at one: each believes it
# owns the table definitions, neither reads the other's history table, and
# whichever runs second cheerfully drops or recreates the first's tables.
#
# Runs once, on an empty data directory. On an existing volume it does not run
# at all, which is why it is written to be idempotent anyway.
set -e

target="${POSTGRES_DJANGO_DB:-cerium_production}"

if [ "$target" = "$POSTGRES_DB" ]; then
  echo "REFUSING: POSTGRES_DJANGO_DB is the same as POSTGRES_DB ($target)." >&2
  echo "Django and Drizzle must not share a database. Fix .env." >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
SELECT 'CREATE DATABASE $target'
 WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$target')\gexec
SQL

echo "Ensured database $target exists."
