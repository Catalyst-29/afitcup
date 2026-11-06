# Campus Football Registration Portal

A mobile-first football competition registration webapp built with Next.js and Supabase.

## Included
- Department token login with automatic department identification
- Team logo: PNG only, max 5MB
- 20–25 player squad registration
- Player photo: JPEG/JPG only, max 5MB, with face/background guidance
- Nigeria fixed as nationality
- DOB calendar input
- Positions: Goalkeeper, Defender, Midfielder, Forward
- Height validation: 140–240cm
- Preferred foot: Right/Left
- Unique jersey number within each team (browser/API/database enforced)
- Final submission lock
- Admin approval/rejection for teams and individual players
- Rejection reasons shown back on department dashboard
- Admin CSV download for player data
- One-click admin download for each original player photo
- Private Supabase image storage with signed URLs
- Responsive UI for mobile, tablet and desktop

## 1. Supabase setup
1. Open your Supabase project.
2. Go to **SQL Editor** → **New query**.
3. Paste the entire contents of `supabase.sql` and run it once.
4. In **Project Settings → API**, copy:
   - Project URL
   - `service_role` key (keep this secret; never expose it in browser code)

## 2. Local setup
Copy `.env.example` to `.env.local` and fill the values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
APP_SESSION_SECRET=use-a-long-random-secret-at-least-32-characters
ADMIN_PASSWORD=choose-a-strong-admin-password
CRON_SECRET=use-a-long-random-secret-for-the-scheduled-force-submission
```

Then:
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.
Admin dashboard: `http://localhost:3000/admin`.

## 3. Deploy to Vercel
1. Push this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Add the same four environment variables under Vercel Project Settings → Environment Variables.
4. Deploy.

## Registration behavior
- A department enters its assigned token and receives a signed HTTP-only session cookie.
- The department name is read from the database and cannot be manually changed.
- The same token returns to the same registration.
- A final submission requires at least 20 and no more than 25 players.
- Team/player statuses are `pending`, `approved`, or `rejected`.
- Admin decisions appear when the team dashboard reloads.
- Approved players cannot be removed by the team.
- Final submission prevents adding or removing players. Existing player details may still be corrected; a correction returns that player to pending review.
- On 6 November 2026 at 08:15 WAT, Vercel Cron force-submits each unsubmitted department that has approved players. Only approved players are included; pending and rejected players remain excluded.

## Image downloads
Photos and logos remain stored privately in the Supabase `competition-files` bucket. The admin interface displays them using temporary signed URLs. The CSV download contains player records, and every player card in the admin dashboard includes a **Photo** button that downloads the stored JPEG. Supabase Storage also keeps files grouped under each department UUID folder for backup/export.

## Production note
The included admin login uses one server-side password for simplicity. For a larger/long-running competition, switching admin access to Supabase Auth with MFA is recommended.
