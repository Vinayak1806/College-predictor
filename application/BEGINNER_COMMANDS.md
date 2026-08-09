# Beginner Commands

Install Node.js, then enable pnpm once:

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

Run these commands from:

```text
D:\Programs\Web Development Project\College Project\application
```

## Start Website

```powershell
pnpm dev
```

Open:

```text
http://127.0.0.1:3000
```

## Create/Update Database Tables

```powershell
pnpm prisma generate
```

```powershell
pnpm prisma db push
```

## Check Build

```powershell
pnpm build
```

## Important

If your PostgreSQL password contains `@`, write it as `%40` in `.env`.

Example:

```env
DATABASE_URL="postgresql://postgres:Natepute%40123@localhost:5432/college_predictor?schema=public"
```
