# Supabase + Vercel setup

Local development keeps using your own PostgreSQL from `.env`. The Vercel deployment uses
Supabase. The code is the same in both places: the only difference is the `DATABASE_URL` each
environment provides, and `db/pool.js` turns on TLS automatically for non-local hosts and on Vercel.

## 1. Create the Supabase project
1. Go to supabase.com and click **New project**. Choose a name, a strong database password
   (save it) and the region closest to the users.
2. Open the project and click **Connect** (top bar). Copy these two strings, replacing
   `[YOUR-PASSWORD]` in each:
   - **Session pooler** (`…pooler.supabase.com:5432`). You will use this from your PC
     for migrations and bootstrap.
   - **Transaction pooler** (`…pooler.supabase.com:6543`). Vercel will use this.
3. Optional: go to Project Settings → **Data API** and turn it off. The app never uses it, and
   migration `039_supabase_lockdown.sql` already blocks it with row level security.

## 2. Create the schema (run from the project folder, PowerShell)
```powershell
$env:MIGRATION_DATABASE_URL="<session pooler URL>"; npm run migrate
```
You should see `Applied 001_…` through `Applied 039_supabase_lockdown.sql`.
Repeat this command whenever a new migration file is added. All the files are safe to re-run.

## 3. Create the first super-admin
The values come from `SUPER_ADMIN_*` in `.env`.
```powershell
$env:MIGRATION_DATABASE_URL="<session pooler URL>"; npm run bootstrap:super-admin
```

## 4. Generate the certificate signing key
```powershell
node -e "console.log(require('crypto').generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}))"
```
Keep the output secret. Vercel cannot use the development key in `.keys/`.

## 5. Deploy on Vercel
1. Go to vercel.com, click **Add New → Project** and import this GitHub repository. The build
   settings come from `vercel.json` (Vite build into `dist/`, `/api/*` → `api/index.js`).
2. Under **Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase **transaction pooler** URL (port 6543) |
   | `NODE_ENV` | `production` |
   | `CERTIFICATE_SIGNING_KEY` | the PEM from step 4 |
   | `APP_URLS` | `https://<your-project>.vercel.app` |
   | `PUBLIC_BASE_URL` | `https://<your-project>.vercel.app` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | as in `.env` |
   | `GEMINI_API_KEY` | as in `.env` |

   Do not set `SUPER_ADMIN_*` or `MIGRATION_DATABASE_URL` on Vercel.
3. Click **Deploy**, open the site and sign in with the super-admin account.

## Notes
- Leave `sslmode=…` out of the Supabase URLs. TLS is configured in `db/pool.js`.
- To copy existing local data across:
  ```powershell
  pg_dump --data-only -Fc "<local DATABASE_URL>" -f data.dump
  pg_restore --data-only --disable-triggers -d "<session pooler URL>" data.dump
  ```
  Run this after step 2 and before step 3. If you restore data, skip step 3 entirely, because
  the super-admin already exists in the copied data.
