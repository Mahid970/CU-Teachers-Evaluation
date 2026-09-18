# CU Rate — teacher evaluation for the University of Chittagong

Students rate their teachers anonymously. The site proves a rater is a real CU
student through their `ID@std.cu.ac.bd` Google account, works out their
department from the ID, and then keeps nothing that could identify them.

**The rule this project is built around:** a student who rates a teacher
honestly must never be exposed by it. A leak, a court order or a dishonest
administrator must all come up empty, because the link between a person and a
rating is never created.

---

## How anonymity actually works

1. **Sign-in.** Google confirms the address ends in `std.cu.ac.bd`. Nothing is
   emailed and no session is stored. The student ID exists in memory for a few
   seconds while the department is worked out.
2. **Blind signatures (RFC 9474).** The browser makes one random secret per
   teacher and blinds it. The server signs values it cannot see, using a key
   that belongs to *one teacher for one term*. A token for teacher A therefore
   fails for teacher B, and the server cannot recognise a finished token.
3. **One recorded fact.** `issuances` holds `HMAC(term pepper, student id)` —
   "this student already collected their tokens". Rotating the pepper at the end
   of term makes those rows unreadable forever.
4. **Rating.** Submitted with no cookie and no sign-in, carrying only the token.
   Stored keyed by the token's hash, with the **date only**.

Signing uses Cloudflare's native `RSA-RAW` when running on Workers: one round of
tokens for a department takes ~60 ms there, against ~9 s on a plain Node dev
server, where the library falls back to big-number arithmetic in JavaScript.
That difference is only ever felt in local development.

Supporting measures: public numbers rebuild once a day; a teacher's scores stay
hidden below five ratings; the browser waits a random moment before sending;
platform logs are off; there are no analytics and no cookies.

| Table | What it holds | Can it identify a student? |
|---|---|---|
| `teachers`, `departments`, `faculties` | public data from cu.ac.bd | no |
| `teacher_term_keys` | per-teacher signing keys | no |
| `issuances` | HMAC of a student ID, date | only until the pepper is rotated |
| `ratings` | token hash, scores, tags, date | no |
| `teacher_stats` | daily aggregates | no |

Run `npm run audit:privacy -- 24304043` after any change to the issuance or
rating path. It dumps every table and fails if a student ID, an email, an IP or
a full timestamp appears anywhere.

---

## Getting started

```bash
npm install
```

Create `.dev.vars` (already git-ignored):

```
MASTER_KEY=<base64 of 32 random bytes>
TERM_PEPPER=<hex of 32 random bytes>
GOOGLE_CLIENT_ID=<client id>.apps.googleusercontent.com
ALLOW_DEV_LOGIN=1
```

Generate the two secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then set up the local database and start the site:

```bash
npm run seed && npm run db:local
MASTER_KEY=$(grep MASTER_KEY .dev.vars | cut -d= -f2) npm run keys:gen -- --term 2026-1 --label "Spring 2026"
npm run dev:sample && npm run stats:build
npm run dev
```

`.env.local` holds `NEXT_PUBLIC_ALLOW_DEV_LOGIN=1`, which shows a development
sign-in box on `/verify` so the flow can be walked through without Google. It is
never enabled in production.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server with D1 and KV bindings |
| `npm test` | unit tests (ID parsing, ranking maths) |
| `npm run check:e2e` | end-to-end check of the token flow against a running dev server |
| `npm run audit:privacy` | fails if anything identifying is in the database |
| `npm run seed` | regenerate `migrations/0002_seed.sql` from `data/cu_teachers.json` |
| `npm run db:local` / `db:remote` | apply migrations |
| `npm run keys:gen -- --term <id>` | one signing key pair per teacher for a term |
| `npm run stats:build` | rebuild aggregates (the cron does this daily) |
| `npm run term:close -- --term <id>` | close a term and destroy its keys |
| `npm run cf:preview` / `cf:deploy` | build and run/deploy on Cloudflare Workers |

---

## Deploying

1. Create the resources and put their ids in `wrangler.jsonc`:
   ```bash
   npx wrangler d1 create cu-teacher-eval
   npx wrangler kv namespace create RATE_LIMIT
   ```
2. Set the secrets:
   ```bash
   npx wrangler secret put MASTER_KEY
   npx wrangler secret put TERM_PEPPER
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put CRON_SECRET
   npx wrangler secret put TURNSTILE_SECRET   # optional
   ```
3. Google Cloud console: create an OAuth client (Web), add the site's origin to
   the authorised JavaScript origins. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the
   build environment to the same value.
4. `npm run db:remote`, then `npm run keys:gen -- --term <id> --remote`.
5. `npm run cf:deploy`.
6. **Check that logging is off** for the production route (Workers Logs and
   Logpush). `wrangler.jsonc` disables observability, but confirm it in the
   dashboard — request logs would undo much of the anonymity work.

### Each term

```bash
npm run term:close -- --term 2025-2 --remote   # destroys last term's keys
npx wrangler secret put TERM_PEPPER            # rotate: old issuance rows become meaningless
npm run keys:gen -- --term 2026-1 --label "Spring 2026" --remote
```

---

## Student ID codes

`src/lib/student-id.ts` decodes `SS F DD NNN` (session, faculty, department,
serial). The codes were verified against the CUCSU 2025 voter lists and the
March 2025 hall allotment result, not just the website, which is wrong in
places:

- **Philosophy (104) and Islamic History & Culture (105) swapped** from session
  2022-2023. Before that, IHC was 104 and Philosophy 105.
- **Oceanography is 902**, not the 901 shown on cu.ac.bd (901 is Marine Sciences).
- **IER uses 113**, an Arts faculty code, though it sits under Education.
- **207 is a legacy code** for marine students admitted up to 2017-2018; those
  students choose their unit, and the choice stays in their browser.

Re-scraping teachers: replace `data/cu_teachers.json`, run `npm run seed`. The
script fails loudly if a department in `src/lib/departments.ts` no longer matches
a unit in the data, so a rename upstream cannot quietly empty a page.

---

## Design

"Evergreen & Bone": deep evergreen on warm bone paper, amber for stars and
ranks, clay for the low end, and no blue anywhere. Editorial layout, Fraunces
for display type, a light paper grain, hard offset shadows instead of glows.
Motion is 150–400 ms on one easing curve, and everything is disabled under
`prefers-reduced-motion`.

Rankings use a Bayesian average (`src/lib/rating.ts`), so three perfect scores
do not outrank eighty strong ones, and teachers below five ratings are left out
of rankings rather than shown as "worst".

---

## Not an official university site

This is an independent student project, not affiliated with or endorsed by the
University of Chittagong. Teacher names and photographs come from the public
pages of cu.ac.bd; corrections and removals are handled through `/corrections`.
