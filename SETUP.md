# V9.1 Setup Checklist

### Supabase
- Create project
- SQL Editor → run `supabase-schema.sql`
- Authentication → Providers → Email enabled
- Email confirmation can be enabled or disabled according to your preference
- Copy Project URL
- Copy Publishable/anon key

### GitHub Pages
Upload all files preserving this structure:
/
  index.html
  app.js
  styles.css
  manifest.webmanifest
  sw.js
  supabase-schema.sql
  README.md
  SETUP.md
  assets/icon.svg

Enable GitHub Pages from the repository's Settings → Pages.
Source: GitHub Actions or Deploy from branch, depending on your repository setup.

### First launch
- Open the deployed app
- Settings → Cloud connection
- Paste Project URL
- Paste Publishable/anon key
- Connect cloud
- Create account
