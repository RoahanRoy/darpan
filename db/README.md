# Database operations

Neon Postgres. `DATABASE_URL` is read from `.env.local` and must never be
prefixed with `VITE_` — Vite inlines anything so prefixed into the browser
bundle, which would publish the credential.

## Everyday commands

| Command | Effect |
| --- | --- |
| `npm run db:migrate -- --dry` | Lists pending migrations. Touches nothing. |
| `npm run db:migrate` | Applies pending migrations. Never destroys data. |
| `npm run db:seed` | Loads `seed.sql`. Refuses if `sources` is non-empty. |
| `npm run db:reset` | Destroys and rebuilds. Gated — see below. |

## Adding a migration

Create `db/migrations/NNN_lower_snake_case.sql` with the next number. Files
apply in filename order, once each, in their own transaction.

Two rules the runner enforces rather than trusts:

- **Never edit an applied migration.** Applied files are checksummed, and a
  changed one stops the runner. The database no longer matches a file that
  claims to describe it, and re-running it would not fix that. Fix forward
  with a new migration.
- **Never destroy data in a migration.** Migrations run unattended on any
  environment. Dropping a column or table belongs in a reviewed, deliberate
  operation, not in a file that `npm run db:migrate` executes by default.

Prefer `IF NOT EXISTS` so a migration can be re-applied to a database that
was built some other way — that property is what let the existing production
database adopt `001_baseline.sql` with zero changes to its data.

CI checks numbering and naming (`scripts/check-migrations.js`), so a
duplicate `003` from two branches fails the pull request rather than
surfacing as an out-of-order apply against production.

## Rebuilding from scratch

`db:reset` is the only script that deletes published rows. It requires two
independent confirmations:

```sh
ALLOW_DESTRUCTIVE_RESET=1 npm run db:reset -- --expect-host <host from DATABASE_URL>
```

The `--expect-host` check exists because the realistic accident is not a
mistyped command — it is a correct command run against a `DATABASE_URL` left
over from a previous shell. Naming the host proves the operator knows which
database is connected.

The ingestion staging tables (`ingestion_runs`, `raw_documents`,
`staged_facts`) survive a reset by design. They hold the review record
proving how each published figure was approved, and that has to outlive any
rebuild of the tables it describes.

## Backups

Neon's point-in-time restore is the recovery path, subject to the retention
window on the current plan. **It is not a backup** — it does not survive
project deletion and it expires. Before anything destructive, take a real
dump:

```sh
pg_dump "$DATABASE_URL" --no-owner --format=custom --file=darpan-$(date +%F).dump
```

Keep the dump off the machine that holds the credential.
