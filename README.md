# ACRE TikTok Frontend

Static frontend prototype for the ACRE editor experience.

## Deploy target

- Active Vercel project: `acre-tiktok-frontend-d1ip`
- Active production URL: `https://acre-tiktok-frontend-d1ip.vercel.app`

## Backend wiring

The frontend reads its API base URL from the `acre-backend-url` meta tag in `index.html`.

Current value:

- `https://acre-tiktok-backend-main.vercel.app`

If the backend project URL changes, update that single meta tag instead of editing multiple scripts.
