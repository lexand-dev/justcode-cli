# Database notes

- Prisma 7, without migration files yet: the schema is applied with `prisma db push`. Before the first shared or deployed database, create a baseline migration (`prisma migrate dev --name init` against an empty database) and use migrations from then on.
- Setup: `docker compose up -d` starts Postgres; set `DATABASE_URL` in both `packages/db/.env` (Prisma CLI) and `apps/server/.env` (server), following the `.env.example` files. The generated client (`packages/db/generated/`) is gitignored and created by `bun install` or `bun run db:generate`.
- Schema changes: edit `packages/db/prisma/schema.prisma`, then `bun run db:push`, which also regenerates the client (Prisma 7 does not regenerate on push). A change that drops data needs `bunx prisma db push --accept-data-loss` from `packages/db`; a renamed field is applied as a drop plus an add.
