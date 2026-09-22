# CU Teachers’ Evaluation — teacher ratings for the University of Chittagong

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
   that belongs to *one teacher*. A token for teacher A therefore
   fails for teacher B, and the server cannot recognise a finished token.
3. **One recorded fact.** `issuances` holds `HMAC(pepper, student id)`, meaning
   "this student already collected their tokens", with two counters: how far
   through their department's list they have been served, and the sequence
   number of the newest teacher their tokens cover. No teacher is ever recorded
   against a student. A teacher who joins later gets the next sequence number,
   and signing in again tops up everything above the student's watermark.
4. **Rating.** Submitted with no cookie and no sign-in, carrying only the token.
   Stored keyed by the token's hash, with the **date only**.
5. **Written reviews.** Carried by the same token but filed under a *different*
   hash of it (`reviewHash` vs `tokenHash`), sent in a separate request, and
   stored in a table that shares no value with `ratings`. Nothing in the
   database pairs a sentence with the scores it arrived with. The table is
   `WITHOUT ROWID`, so insertion order cannot be used to line the two up either.
6. **The vault (rating from a second device).** The browser derives a key from a
   passphrase with PBKDF2-SHA512, encrypts the token bundle, and uploads only
   the ciphertext. The row's lookup is derived from the student ID *and* the
   passphrase together and computed in the browser, so `/api/vault` never sees
   an identity — it takes a hash and a blob, and has no sign-in at all. Rows are
   wrapped a second time under `VAULT_PEPPER`, a Workers secret, so a leaked
   database on its own gives an attacker nothing to guess passphrases against.
   There is no reset: a reset would mean the server could open a vault itself.

Signing uses Cloudflare's native `RSA-RAW` when running on Workers: one round of
tokens for a department takes ~60 ms there, against ~9 s on a plain Node dev
server, where the library falls back to big-number arithmetic in JavaScript.
That difference is only ever felt in local development.

Supporting measures: the browser waits a random moment before sending;
platform logs are off; there are no analytics and no cookies. Scores show from a teacher's first rating (the owner's decision), so
with one or two ratings a teacher may be able to guess who rated them. The
privacy page says so. Scores also update the moment a rating is saved (the
owner's decision), so a teacher may be able to time a change to a student; the
privacy page says that too.

| Table | What it holds | Can it identify a student? |
|---|---|---|
| `teachers`, `departments`, `faculties` | public data from cu.ac.bd | no |
| `teacher_term_keys` | per-teacher signing keys | no |
| `issuances` | HMAC of a student ID, date, two counters | only with the pepper, and only that they collected tokens |
| `ratings` | token hash, scores, date | no |
| `reviews` | review hash, body, date | no — and no key in common with `ratings` |
| `vaults` | peppered lookup, doubly-encrypted bundle | not without the student's passphrase |
| `teacher_stats` | aggregates, updated on each rating and rebuilt nightly | no |

Run `npm run audit:privacy -- 24304043` after any change to the issuance or
rating path. It dumps every table and fails if a student ID, an email, an IP or
a full timestamp appears anywhere. It also checks the shape rather than only the
contents: that `ratings` and `reviews` share no key, that `vaults` holds nothing
but ciphertext, and that no vault lookup matches an issuance hash.

**What the vault costs.** Before it existed, the link between a student and
their ratings did not exist anywhere, in any form. It now exists as ciphertext,
protected by the student's passphrase. A weak passphrase is worth less than a
strong one, and whoever serves this site's JavaScript could capture one as it is
typed. Both are stated plainly on the privacy page rather than buried.

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
| `npm run teachers:sync` | add new teachers from `data/cu_teachers.json`, safely (report only without `--apply`) |
| `npm run keys:gen -- --term <id>` | a signing key for every teacher who lacks one; never replaces a key |
| `npm run stats:build` | rebuild every teacher's aggregates (the cron does this nightly) |
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
   npx wrangler secret put VAULT_PEPPER       # wraps every vault row
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

### Ratings are permanent

There are no terms. Internally the site has one term, `2026-1`, which stays
open for good: a student collects their tokens once, rates each teacher once,
and can change that rating at any time. Keep it that way:

- **Never rotate `TERM_PEPPER`.** It is what recognises a student who already
  collected tokens. A new pepper would let every student collect a second set
  and rate everyone twice.
- **Never replace a teacher's key.** Students hold tokens signed with it for
  good. `keys:gen` only ever adds keys for teachers who have none, so it is
  safe to run again; do not delete rows from `teacher_term_keys` by hand.
- **Never re-run `npm run seed` against production.** It deletes and
  re-inserts every teacher. Use `teachers:sync` instead.

### Adding teachers

After refreshing `data/cu_teachers.json`:

```bash
npm run teachers:sync -- --remote            # see what would change
npm run teachers:sync -- --remote --apply    # add new, update details, retire missing
npm run keys:gen -- --term 2026-1 --remote   # keys for the new teachers only
```

New teachers are added at the end of their department with the next sequence
number. Students who collected earlier get their tokens the next time they sign
in (or restore their vault on a new device); students collecting for the first
time get them with everyone else. Teachers missing from the source are marked
inactive, never deleted, because ratings point at them.

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
do not outrank eighty strong ones, and teachers with no ratings are left out
of rankings rather than shown as "worst".

---

## Not an official university site

This is an independent student project, not affiliated with or endorsed by the
University of Chittagong. Teacher names and photographs come from the public
pages of cu.ac.bd; corrections and removals are handled through `/corrections`.
