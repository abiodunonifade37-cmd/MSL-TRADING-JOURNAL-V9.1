# MSL Trading Journal V9.1

A mobile-first trading journal PWA with optional Supabase cloud mode.

## What changed
- Email/password authentication only
- Supabase cloud database + RLS
- Local demo mode
- Trade journal with liquidity, sweep, premium/discount, OB/FVG, MSS and IDM-style confirmation fields
- Model versioning
- Analytics for setup/liquidity/checklist performance
- Playbook
- JSON export/import
- Clear local data
- PWA manifest and service worker
- Screenshot URL field and Supabase Storage bucket/policies

## Setup
1. Create a Supabase project.
2. Open SQL Editor.
3. Paste `supabase-schema.sql` and run it.
4. In Authentication > Providers, enable Email. Google and phone providers are intentionally not used.
5. Deploy these files to GitHub Pages.
6. Open Settings in the app and enter the Supabase Project URL and public Publishable/anon key.
7. Reload. Create an account using email/password.

Never place a Supabase service-role/secret key in the app.
