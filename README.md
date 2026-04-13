# ACRE Frontend

This repo is now the Next.js App Router frontend for ACRE. It keeps the current TikTok and X backend flow in place while adding a cleaner structure for Supabase auth, Google sign-in, and future dashboard work.

## Stack

- Next.js App Router
- React 19
- Supabase Auth with cookie-based SSR helpers
- Existing Vercel backend for TikTok and X OAuth

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
# Optional fallback if you are copying directly from the Supabase connect modal:
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_xxx

NEXT_PUBLIC_BACKEND_URL=https://acre-tiktok-backend-main.vercel.app
```

## Google Sign-In Setup

1. In Supabase, enable `Authentication > Providers > Google`.
2. Add your app callback URLs to Supabase redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://acre-tiktok-frontend-d1ip.vercel.app/auth/callback`
3. In Google Cloud, use the callback URL shown by Supabase on the Google provider screen.
4. Set your Site URL in Supabase to your frontend domain.

The app prefers `/auth/callback` for Supabase auth, but the homepage also forwards root-level `?code=` redirects into the callback route as a safety fallback.

## Local Development

```bash
npm install
npm run dev
```

## Current Migration Notes

- `index.html` remains in the repo as a legacy reference during the migration.
- The copied `acre-tiktok-backend-main/` folder is ignored so it does not get committed accidentally.
- TikTok and X still route through the live backend while Google auth is handled by Supabase.
