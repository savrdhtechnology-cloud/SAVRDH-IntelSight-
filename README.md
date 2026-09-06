# SAVRDH IntelSight™

**Public Intelligence & Digital Investigation Platform**  
OSINT • Digital Forensics • Identity Intelligence

SAVRDH IntelSight is being developed as a professional public-data intelligence workspace for authorized research, due diligence, cyber-risk review and investigation teams.

## Current Phase 1 build

- Premium SAVRDH IntelSight landing page
- `/app` animated Lead 360 Analytics Dashboard
- `/app/profile` detailed Lead 360 public profile
- Email / mobile / username / domain search interface
- Tavily-backed public web discovery when configured
- Live public RDAP lookup for domains
- Live public GitHub profile lookup for usernames
- Evidence-linked results with confidence and visibility scores
- Animated visibility trend, source distribution, confidence/credibility gauges
- Global public-presence visualization and relationship graph
- Platform signal comparison, strongest evidence, recent activity and live scan activity
- Timeline and defensive exposure summary UI
- Cases, relationship graph, reports, watchlists, sources and audit-log module shells
- Supabase client foundation
- Supabase PostgreSQL schema with RLS foundation
- Vercel serverless search API

## Safety scope

IntelSight is designed for public, licensed, consented or otherwise authorized sources. It should not expose stolen passwords, OTPs, private messages, session tokens/cookies or private-location surveillance. Cross-source identity matches are treated as confidence-scored investigative leads and require human verification.

## Run locally

```bash
npm install
npm run dev
```

Open:

- Website: `http://localhost:3000/`
- Analytics dashboard: `http://localhost:3000/app`
- Detailed Lead 360 profile: `http://localhost:3000/app/profile`

## Supabase setup

1. Create a dedicated Supabase project.
2. Review and run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Add `VITE_SUPABASE_URL` and the Supabase anon key.
5. Keep service-role keys and third-party provider secrets server-side only.

## Production connectors

The current backend supports Tavily public web discovery when `TAVILY_API_KEY` is configured, plus RDAP and GitHub public connectors. Defensive breach exposure should use a licensed provider and return exposure summaries only, never stolen secrets.
