# Deploying to Netlify

This project uses Next.js (App Router) and works on Netlify with the official Next.js plugin.

## 1) Prerequisites
- Netlify account
- Supabase project (URL + anon key)
- Optional: OpenAI API key if you plan to use AI summaries

## 2) Files added
- `netlify.toml` — configures the build and enables the Netlify Next.js plugin
- `.nvmrc` — pins Node 18 for local dev parity

## 3) Netlify site setup
1. Push your repo to GitHub/GitLab/Bitbucket.
2. In Netlify → Add new site → Import from Git.
3. When prompted:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Environment: Node `18` (Netlify auto-detects from `netlify.toml`).
4. Add environment variables (Site settings → Environment variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = https://YOUR-REF.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `OPENAI_API_KEY` = your key (optional; required for AI)
   - `OPENAI_MODEL` (optional)
   - `AI_SUMMARY_MAX_TOKENS` (optional)
   - `AI_TEMPERATURE` (optional)

## 4) Supabase Auth redirect URLs
In Supabase Studio → Authentication → URL Configuration, add:
- Site URL: https://YOUR-NETLIFY-SUBDOMAIN.netlify.app
- Additional Redirect URLs: your custom domain if any

Keep localhost entries if you still develop locally.

## 5) Notes about Next.js on Netlify
- API routes in `app/api/**` run as Netlify Functions automatically via the plugin.
- Edge/runtime differences: If you need Node APIs, ensure the route isn’t forced to the Edge runtime.
- Images are set to `unoptimized: true` in `next.config.js`, which is compatible with Netlify.

## 6) Debugging
- Check Netlify deploy logs for build errors.
- If environment variables are missing, you’ll see runtime 401s from Supabase or an AI config error in logs.
- Use Netlify’s "Trigger deploy" after changing env vars.

## 7) Local build check (optional)
```powershell
# from the project folder
npm ci
npm run build
```

If it builds locally with Node 18, it should work on Netlify.
