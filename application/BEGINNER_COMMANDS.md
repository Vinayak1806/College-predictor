# Beginner Commands

Your Windows PowerShell does not know plain `pnpm`, so use the full Codex pnpm
path.

Run these commands from:

```text
D:\Programs\Web Development Project\College Project\application
```

## Start Website

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' dev
```

Open:

```text
http://127.0.0.1:3000
```

## Create/Update Database Tables

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' prisma generate
```

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' prisma db push
```

## Check Build

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' build
```

## Important

If your PostgreSQL password contains `@`, write it as `%40` in `.env`.

Example:

```env
DATABASE_URL="postgresql://postgres:Natepute%40123@localhost:5432/college_predictor?schema=public"
```

