<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-rules -->

# CU Teachers’ Evaluation — rules for this project

The privacy design is the product. Before changing anything under
`src/app/api/`, `src/lib/blind.ts`, `src/lib/server-crypto.ts`,
`src/lib/vault.ts` or `src/lib/guard.ts`, read the "How anonymity actually
works" section of the README.

Hard rules:

1. **Never store anything that identifies a rater.** No email, student ID, IP,
   user agent, cookie, session, or full timestamp. Dates only.
2. **Never join issuance to ratings.** `issuances` says a student collected
   tokens; `ratings` says what was rated. No column, index or log may connect
   them. If a feature needs that link, the feature is wrong.
3. **The rating endpoint takes no authentication.** A token is the only proof,
   and it must stay unlinkable to a sign-in.
4. **Aggregates update on write, by the owner's decision (September 2026).**
   A rating rebuilds its own teacher's row in `teacher_stats` as it is saved,
   and a full rebuild runs nightly. This lets a teacher time a score change to a
   student; the privacy page says so plainly. Keep that page honest if this
   changes again, and never add anything that makes the timing sharper (such
   as storing a rating's time, not just its date).
5. **A written review is never stored beside its own scores.** Free text is the
   most identifying thing a rating carries, and the teacher reading it has the
   most context to decode it. So a review is filed under a *different* hash of
   the token (`reviewHash`, not `tokenHash`), sent in its own request, and kept
   in a table that shares no value with `ratings`. Never insert them together,
   never return them together, and never publish one before
   `MIN_REVIEWS_TO_SHOW` exist. The `reviews` table is `WITHOUT ROWID` on
   purpose: insertion order is itself a way to line the two tables up.
6. **The vault is ciphertext we cannot open.** `/api/vault` receives a lookup
   and a blob, and nothing else. Never add a sign-in to it, never accept a
   student ID there, and never derive the lookup server-side: an endpoint that
   sees an identity and a lookup in one request can record the pair, which is
   precisely the link everything above exists to prevent. The lookup is
   computed in the browser from the student's ID *and* their passphrase, so the
   stored row cannot be attributed to anyone without the passphrase.
7. **There is no passphrase reset, and there must not be.** A reset means the
   server can open a vault by itself. If a feature needs that, the feature is
   wrong.

After touching any of that, run:

```bash
npm test && npm run check:e2e && npm run audit:privacy -- 24304043
```

`check:e2e` needs `npm run dev` running. The audit fails if anything
identifying reached the database.

Student ID codes in `src/lib/student-id.ts` were verified against the CUCSU
2025 voter lists and the March 2025 hall allotment result. Where they disagree
with cu.ac.bd, the code is right and the website is wrong — see the README.
<!-- END:project-rules -->
