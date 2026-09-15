# Aspire Mobile Detailing

Marketing and lead-capture website for Aspire Mobile Detailing, built with Next.js and deployed on Vercel.

## Local development

This project requires Node.js 22.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Add these variables to `.env.local` for local development and to the Vercel project for Preview and Production deployments:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by the assessment API route. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key used to insert assessment requests under RLS. |
| `N8N_WEBHOOK_URL` | No | Server-only webhook that receives a notification after a lead is saved. |

Do not add a Supabase service-role key to this project. The assessment form uses the publishable key and the database's restricted insert policy.

## Verification

```bash
npm run lint
npm run build
```

The production build writes the standard `.next` output expected by Vercel.
