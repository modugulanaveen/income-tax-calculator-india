# Payroll App

A payroll management app built with React and Vite.

## Shared data setup

The app now supports shared storage through Supabase. If the Supabase environment variables are present, the app will save and load payroll data from your Supabase table. Otherwise it falls back to local browser storage.

### Required environment variables

Create a .env file with:

```bash
VITE_SUPABASE_URL=https://huhzaqdlvnpqmzjdktx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZWRiOau10qsfszqzHxawFw_TVfg3gN7
VITE_SUPABASE_TABLE=payroll_data
```

### Supabase table

Run the SQL in [supabase-setup.sql](supabase-setup.sql) in your Supabase SQL editor. It creates the `payroll_data` table and the basic policies needed for the app to read and write shared data.

If you deploy to Vercel, add the same environment variables in the project settings.

## Quick initialize Supabase locally

After you run the SQL in `supabase-setup.sql`, you can seed an initial `app` row from your local machine using the included script.

1. Ensure your `.env` contains the Supabase values (example in `.env.example`).
2. Run:

```bash
node scripts/initSupabase.js
```

The script will insert or merge an `id: 'app'` row into the `payroll_data` table so the app can immediately read shared data.
