# Database Source of Truth

The authoritative database definition is `application/prisma/schema.prisma` plus
the migration folders under `application/prisma/migrations/`.

Do not maintain a second handwritten copy of the schema. Use Prisma commands
from the `application` directory:

```powershell
pnpm prisma generate
pnpm prisma migrate dev
```

Before applying production migrations, create and verify a PostgreSQL backup as
described in `documentation/launch-runbook.md`.
