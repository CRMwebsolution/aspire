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
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by the public site, assessment form and employee dashboard. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key used by browser and server clients under RLS. |
| `N8N_WEBHOOK_URL` | No | Server-only webhook that receives a notification after a lead is saved. |

Do not add a Supabase service-role key to this project. Public requests and employee operations use the publishable key with database row-level security.

## Employee dashboard

Employees sign in at `/login` and are sent to the private workspace at `/dashboard`. The app uses invite-only Supabase Auth; there is no public account-registration route. Access also requires an active row in `aspire_employee_access` for the Aspire business, so an authenticated user from another business cannot read or write Aspire records.

The migration in `supabase/migrations` creates the Aspire-scoped schema, RLS policies, catalog seed data, loyalty settings, rewards and the initial private support access. Apply it once to a new Supabase environment before using the dashboard.

Employee invitations and role changes run through the protected `aspire-manage-employees` Supabase Edge Function. Employee accounts default to the `employee` role and remain visible; `admin` accounts can manage the full calendar. Calendar row-level security limits employees to appointments assigned to them while administrators retain business-wide access.

## Verification

```bash
npm run lint
npm run build
```

The production build writes the standard `.next` output expected by Vercel.
