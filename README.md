# TaskFlow — Milestone 1 Foundation

**Status:** Source package delivered; deployment and cloud integration are NOT verified until you connect your own services and run the checks below. **No real workplace data.**

## What is included
- Next.js 16 TypeScript application with professional responsive UI, light/dark mode, left sidebar and dashboard layout.
- Real Supabase email/password sign-in and TOTP MFA enrollment/challenge flow.
- Server-checked owner identity and MFA on every sites API request and private page.
- PostgreSQL Row Level Security enforcing the registered single owner AND MFA AAL2.
- Real cloud-backed site list with add/edit/rename/colour persistence and honest save/error indicators.
- Four **clearly marked fictional** Overview widgets, global site filter, adjustable-looking demo mini timeline (the selected range does not alter fictional data yet).
- Placeholders for Projects, Master Timeline, Notes, Achievements and Reports (later milestones only).
- SQL migration, setup checklist and static smoke check.

## 1. Accounts you control
1. Create a private GitHub repository for source control (optional until deployment).
2. Create a new Supabase project for **fictional testing only**.
3. Choose a Next.js-capable managed host with terms appropriate to the intended usage; Vercel is one candidate but its free Hobby plan is not for commercial/business projects. Do not pay or deploy until you approve terms.
4. Enable MFA on both your Supabase administration account and hosting accounts. Keep credentials and recovery methods private.

## 2. Configure Supabase
1. In Supabase Auth settings, **disable public sign-ups**. Configure email/password login.
2. In Auth > Users, create **one** owner account via the administrator interface. Verify its email. Do not share the password in chat.
3. Open SQL Editor and run `supabase/migrations/0001_foundation.sql` in the **new** project.
4. Copy the **user UUID** of your created Auth user (not your email or password).
5. Run in SQL Editor, replacing the placeholder UUID:
   ```sql
   insert into private.owner_accounts (user_id)
   values ('YOUR_AUTH_USER_UUID');
   ```
6. Confirm `sites` has RLS enabled and is not accessible with the anon role.
7. Set up Auth TOTP MFA. First sign-in inside TaskFlow offers authenticator enrolment. Subsequent sign-ins require challenge verification.
8. Plan a **second verified recovery method** before relying on the account for important data. This app currently does **not** include a recovery-code workflow or second-factor management UI. Provider admin recovery differs from app login recovery. Document/test an appropriate procedure with your provider; do not assume email resets bypass MFA.

## 3. Local development (personal computer only)
Requires Node.js 22 or a currently supported LTS version. **No installation on workplace devices**.
```bash
cp .env.example .env.local
# Set the values below in .env.local; never commit it
npm install
npm run dev
```
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using Supabase Project Settings > API. The publishable key is intended to be public, but never put a **secret** key or service role key in NEXT_PUBLIC variables.

Open `http://localhost:3000`. Sign in and complete MFA. Test adding and renaming a fictional site, then reload.

## 4. Private online test deployment
1. Put source in a private repository or use your chosen host's secure import/deployment method.
2. Connect the project to a Next.js-compatible host (Next.js 16, Node.js 22 supported).
3. Add the same two public environment variables as host environment secrets/configuration.
4. Configure any required site URLs and redirect domains in Supabase Auth settings.
5. Deploy over HTTPS. **Do not treat an unguessable preview URL as access control:** owner authentication and MFA remain mandatory.
6. Test the complete login, MFA, site create/edit/reload and sign-out flow from a personal browser.
7. Test the site's webpage plus sign-in, Supabase connectivity and required APIs from your workplace browser before declaring workplace compatibility.
8. Confirm a second recovery procedure and backup/restore capabilities before storing anything beyond fictional data.

## 5. Checks and limitations
- `npm run test:static` checks source file presence and key static security controls. It does **not** prove real RLS, MFA or deployment behaviour.
- `npm run typecheck`, `npm run build` need dependencies downloaded via `npm install`.
- Owner security needs manual validation with an anonymous session, a signed-in session lacking MFA and an unrelated authenticated test identity. All must be denied `sites` access; only registered owner at AAL2 may access.
- Cloud deployment cannot be completed from a code package without credentials/host access.
- No current live test site has been published or checked.
- No complete tasks, progress calculations, notes or stakeholder reports in this milestone. These are deliberately later stages.
- The Demo Overview's fictional Site A/B/C names are samples; they only match your cloud site filter when site names match. The mini timeline's range select is only an interface preview.
- App TOTP is required; MFA factor management and robust account recovery remain a **Milestone 1 acceptance gate** before sign-off.
- `public.am_i_owner()` is a narrow boolean function and uses a private owner registry; do not expose the private schema in the Data API settings.

## 6. Milestone 1 review gates
- [ ] Dependencies installed, `npm run typecheck` and `npm run build` pass.
- [ ] RLS enforced against anon, AAL1 and nonowner identities.
- [ ] MFA enrollment and subsequent sign-in tested.
- [ ] Site create/edit persists after sign-out/sign-in.
- [ ] Site filter and four clearly labelled demo widgets render.
- [ ] Save failures and offline warning are not misleading.
- [ ] Responsive desktop and phone layouts checked.
- [ ] Private test URL deployed, opens over HTTPS.
- [ ] Workplace browser connectivity checked (including Supabase).
- [ ] MFA recovery plan tested and backup approach documented.
- [ ] Owner formally approves Milestone 1 before any Milestone 2 work.

## Security notes
SQL migration limits `sites` operations to one registered owner and an `aal2` JWT. The UI/server checks alone do not replace database RLS. Never expose secret credentials. Restrict invitations/sign-ups. Use fake information until organisational approval. Report sharing isn't present in Milestone 1.
