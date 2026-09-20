<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-rules -->

# CU Teachers Evaluation — rules for this project

The privacy design is the product. Before changing anything under
`src/app/api/`, `src/lib/blind.ts`, `src/lib/server-crypto.ts` or
`src/lib/guard.ts`, read the "How anonymity actually works" section of the
README.

Hard rules:

1. **Never store anything that identifies a rater.** No email, student ID, IP,
   user agent, cookie, session, or full timestamp. Dates only.
2. **Never join issuance to ratings.** `issuances` says a student collected
   tokens; `ratings` says what was rated. No column, index or log may connect
   them. If a feature needs that link, the feature is wrong.
3. **The rating endpoint takes no authentication.** A token is the only proof,
   and it must stay unlinkable to a sign-in.
4. **Aggregates rebuild on a schedule, never on write.** Live updates would let
   a teacher time a rating to a student.
5. **No free-text fields on ratings.** Writing style identifies people.

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
