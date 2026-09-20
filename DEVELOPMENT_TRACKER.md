# Development Tracker

A plain-language log of how this project was built, step by step.

The project was built first and put into Git afterwards, so these commits were
made in one pass. Each one covers a real stage of the work, in the order it
happened, and each entry below says what that stage was for.

**The project:** a website where University of Chittagong students rate their
teachers anonymously. A student signs in with their university Google account,
the site works out their department from their student ID, and then it forgets
who they are — nothing stored can link a person to a rating.

## 1. Setting up the project

Created the empty website project (Next.js, TypeScript, Tailwind CSS) and the
basic config files. Nothing visible yet — this is the foundation everything else
sits on. Secret files are excluded from Git from the very start, so passwords and
keys can never be uploaded by accident.

## 2. Adding the university data

Added the two data files collected earlier: every teacher of the university
(1,036 people across 10 faculties and 64 departments), and the meaning of student
ID numbers. The ID codes were checked against real student lists, not just the
university website — the website is wrong in a few places.

## 3. Reading a student ID

Wrote the code that turns a student ID like 24304043 into 'Marketing student,
session 2023-2024'. This is how the site knows which teachers a student is
allowed to rate, without asking them anything.

It handles the awkward cases: Philosophy and Islamic History swapped code numbers
in 2022, Oceanography's real code is not the one on the university website, and
old marine students share a code so the site asks them which unit they were in.
Tests cover all of it.

## 4. Deciding how rating works

Set the six things students rate a teacher on (clarity, knowledge,
punctuality, fair marking, accessibility, engagement), plus overall, difficulty
and 'would you take their course again'.

Also wrote the ranking maths. A simple average is unfair: a teacher with three
perfect scores would beat a teacher with eighty very good ones. The site uses a
weighted average that takes the number of ratings into account. Teachers with
fewer than five ratings are kept out of rankings entirely.

## 5. Building the database

Created the database tables and a script that loads the teacher data into
them. The design is deliberate: the ratings table has no column that could point
to a person, and teacher email addresses are dropped on the way in, because the
site never needs them.

The loading script refuses to run quietly if a department name changes in the
data, so a page can never silently end up empty.

## 6. Choosing where it runs

Set the site up to run on Cloudflare — cheap, fast, and it lets us switch
request logging off completely, which matters here: logs of who visited and when
would undo much of the anonymity work. Also scheduled a daily job that will
refresh the public numbers.

## 7. The look of the site

Built the visual style: deep green on warm off-white paper, amber for stars,
with a printed-magazine feel rather than a typical tech website. No blue
anywhere, by choice. Added the page frame (header, footer) and a light/dark mode
switch that remembers the reader's choice on their own device.

## 8. Movement and stars

Added the small animations used across the site — sections fading in as you
scroll, numbers counting up, bars growing — all on one consistent timing so it
feels calm rather than busy. Anyone whose device asks for less motion gets none
of it.

Also built the star control, which works with a mouse, a finger, or the keyboard
alone, and reads correctly to screen readers.

## 9. The teacher list and leaderboard

Built the teacher cards and the list that powers both the homepage
leaderboard and the full directory. You can sort by highest rated, lowest rated,
most rated or name, and filter by faculty; the rows slide into their new
positions instead of jumping. Teachers without enough ratings stay hidden from
the rankings.

## 10. The homepage

Put the homepage together: a headline, the two main buttons, live counts of
teachers and ratings, the leaderboard, a short explanation of how it works, the
faculty grid, and a plain list of what the site refuses to store about you.

## 11. The pages for browsing

Added the rest of the public pages: search every teacher, browse faculties
and departments (each showing its student ID code), and a page per teacher with
the score breakdown, the spread of scores, tags, and colleagues in the same
department. Teachers under five ratings get a proper explanation instead of a
blank page.

## 12. The heart of it: anonymous tokens

This is the part that makes honest rating safe.

When a student signs in, their browser creates a secret for each teacher and
scrambles it. The server signs something it cannot read, using a key belonging to
one teacher for one term. The student unscrambles the result and keeps it. Later,
a rating arrives carrying only that token: it proves the student was entitled to
rate that teacher, and proves nothing else. The server cannot recognise it as
belonging to anyone.

A token for one teacher is useless for another. The teachers' signing keys are
kept locked with a master key, and they are destroyed when the term ends.

## 13. Checking the student is real

Students sign in with their university Google account. The site asks Google
for one thing only: that the address ends in std.cu.ac.bd. No email is sent, no
login is stored, and the student ID is held in memory for a few seconds to work
out their department, then dropped.

The server records exactly one fact: that a student with that ID already
collected their tokens this term, stored as a scrambled value whose key is thrown
away at the end of term. That single fact is what stops one person voting twice.

## 14. Sending a rating

Built the part that receives ratings. It has no login and no cookies on
purpose — the token is the only proof. Sending the same token again edits that
rating instead of adding a second one, so students can change their mind.

Ratings are saved with the date only, never the time, so nobody can line a rating
up with the moment a particular student signed in. The student's tokens live in
their own browser, with a backup file they can save.

## 15. The screens students actually use

Three screens: sign in and see your department confirmed; a private checklist
of teachers you still have to rate, which only exists in your own browser; and
the rating form itself.

The form waits a random moment before sending, so the time you rate cannot be
matched to the time you signed in. When it is done, a stamp presses onto the
page.

## 16. Public numbers, refreshed once a day

The scores shown on the site are rebuilt once a day rather than the moment a
rating arrives. If they updated instantly, a teacher could watch their score move
right after a particular student left the room.

Also added a script that fills the local database with realistic fake ratings, so
the design can be judged properly during development.

## 17. Saying plainly what we do and don't keep

Wrote the public pages: exactly what is stored and what is not, how anonymity
works in plain words, and — importantly — what it does not protect against. No
overstating.

Also rating guidelines (rate the teaching, not the person; a hard course is not a
bad teacher), terms, and a page for teachers who want their details corrected or
removed. Written comments are not collected at all, because writing style can
identify the student who wrote them.

## 18. Guarding against abuse

Added limits that slow down automated abuse without recording who anyone is:
the counter is keyed by a deliberately coarse value that many people share, and
it expires within the hour.

Also wrote the end-of-term script. It closes rating, destroys the signing keys,
and deletes the record of who collected tokens — after which not even we could
work out who took part.

## 19. Proving it actually works

Two scripts that can be run any time.

The first walks the whole flow and tries to break it: it checks that a token for
one teacher is refused for another, that a forged token is refused, that
re-rating edits instead of duplicating, and that nobody can collect a second set
of tokens.

The second is the important one. It dumps every table in the database and fails
if it can find a student ID, an email address, an IP address or a timestamp
anywhere. That is the promise of this site, checked by a machine instead of
trusted.

## 20. Writing it down for whoever comes next

Wrote the README: how anonymity works, how to run it, how to deploy it, and
the routine at the end of each term. Also recorded the rules a future contributor
must not break — never store anything identifying, never link sign-ins to
ratings, no login on the rating endpoint, no free-text comments.

## 21. Making sign-in fast

Testing on the real Cloudflare runtime showed sign-in took around nine
seconds, because the signing library was doing heavy maths in JavaScript. On
Cloudflare there is a native way to do the same thing, so the site now detects
where it is running and uses it, and signs all the tokens at once instead of one
after another.

The same test caught a bug that only appears on the real runtime, where the fast
path rejected the stored key format. Fixed.

Result: 9 seconds down to 59 milliseconds for a department of twenty teachers,
with all the security checks still passing.

## 22. Repository tidy-up

Removed a duplicate copy of the ID-codes file from the project root (the one
inside the data folder is the one the site uses), and stopped tracking a local
settings file that only applies to one machine.

## 23. Going live on Cloudflare

Moved off the laptop and onto real infrastructure.

Created the production database and storage on Cloudflare, loaded all 1,019
teachers, and deployed the site to a live address. Generated a signing key for
every teacher for this term, stored locked with a master key kept in
Cloudflare's secret store.

Two changes were needed to make it work properly on the free plan:

- **Token signing is now done in small batches.** A single request that signed
  every teacher at once used too much processing time for the free plan, and a
  dropped connection lost everything. The browser now collects tokens a few
  teachers at a time, shows a progress bar, and saves them as they arrive. The
  server decides which teachers each batch covers, so nobody can pile all their
  tokens onto one teacher.
- **Fetching only the keys actually needed.** The old code read all 1,019
  teachers keys on every sign-in to use twenty of them.

The site is live, the login is switched off until Google sign-in is set up, and
there are no ratings in the real database yet — a clean start.

## 24. Real Google sign-in switched on

Installed the Google sign-in details, so students can now verify with their real
university account. Also raised the request limits: a whole campus shares a few
internet addresses, and the batching change means each sign-in makes about eight
requests, so the old limit would have blocked classmates after a handful of
students had signed in.

## 25. A design of its own

Redesigned the site. The old look leaned on things that show up on a lot of
AI-made websites: a cream background with a fancy serif, small capital labels
above every heading, numbered 01/02/03 markers, arrows inside link text, and a
paper-grain texture. It looked designed, but it did not look like *this*
project.

The new idea comes from what the site actually is — a scoreboard. Ranks, scores
and spreads are the content, so the numbers are now the loudest thing on the
page, set in a wide, confident typeface.

The homepage now opens with a student ID being taken apart: 24 | 3 | 04 | 043,
labelled session, faculty, department and you. It explains in three seconds how
the site knows your department, and that the number is all it ever reads. It is
also the only animation on the site; everything else moves only when you do
something.

Three things I fixed while looking closely:

- **The leaderboard looked broken.** It ranked by the weighted score but showed
  the plain average, so a 4.8 could sit below a 4.6. The number shown is now the
  number it is ranked by, with enough decimal places for the order to make sense.
- **The rating bars were useless.** Every bar was almost full, because they ran
  from zero when the lowest possible score is one.
- **The light/dark button showed both icons at once.**

## 26. Movement, in the places it helps

Added animation across the site, kept deliberately light.

- **Smooth scrolling**, so jumping to a faculty glides instead of snapping.
- **Sections arrive as you scroll** — a short fade and rise, driven entirely by
  CSS. There is no JavaScript behind it, so it costs nothing, and browsers that
  do not support it simply show the content.
- **Hover feedback** on teacher rows: the row lifts slightly, the photo leans
  in, and the score brightens. Links grow an underline from the left, and
  buttons press in when clicked.
- **The leaderboard answers you.** Changing the sort replays a quick settle down
  the list, so you can see it re-ordered rather than blink.
- **Teacher photos travel.** Opening a teacher from a list carries their photo
  across to their page, so it reads as the same person rather than two pictures
  swapping.
- **The counts on the homepage count up** the first time they come into view.

Anyone whose device asks for less motion gets none of it — not the scrolling,
not the reveals, not the page transitions.

One bug worth recording: the scroll reveals first measured progress as a share
of each block's height, which never completes for a block taller than the
screen. Headings sat at about seventy percent opacity for as long as you looked
at them. They now finish after a fixed amount of scrolling, whatever the size of
the block.

## 27. A promise you can test yourself

Replaced the right side of the homepage with something you can actually try.

The site's central claim is that nobody can connect a rating back to the student
who gave it. That is easy to write and hard to believe, so now you can test it:
the panel shows a pool of rating tokens, you press a button to mark the one that
is yours, and then the pool shuffles. The mark dissolves while everything is
still moving, and you are left unable to say which one was yours — which is
exactly the position the site itself is in.

It is not a trick of the animation. Once a token has been signed and spent,
there genuinely is nothing in it that points back to a person, so following it
is impossible for us too.

Above it, a short line still shows a student ID being split into session,
faculty, department and serial, with a note that it is read once and thrown
away. The two halves of the promise now sit together: this is what we read, and
this is where your rating goes.

A cascade bug turned up while building it. A global border rule sat outside the
style layers, and rules outside a layer quietly beat rules inside one, so every
selected and hover border on the site was being overridden without any error.

## 28. A map of the campus

Replaced the hero with a map of the University of Chittagong.

The previous idea was clever but cold — a pool of tokens students have no
feeling about. This is the place they actually walk: the lakes, the roads
bending around the hills, the faculty buildings, the shuttle station.

Every shape on it is real. The campus outline, 287 buildings, 46 lakes and ponds
and 65 roads come from OpenStreetMap, and a faculty is only marked where the map
data actually names that building — nothing is placed by guesswork. Seven
faculty buildings are named there: Arts, Science, Commerce (Business), Social
Sciences, Law, Engineering and Marine Sciences.

Point at a building and it tells you the faculty and how many teachers it has.
Click it and you land on that faculty's departments. The map draws itself in
once when the page loads — water, then roads, then buildings, then the markers
drop onto it.

The token demo was not thrown away: it moved to the privacy page, under a
heading inviting you to test the claim, which is where that argument belongs.

## 29. Map refinements, and making the site fast

**The map.** Turned it on its side so it fills the width, dropped the text bar
under it (the faculty name now appears on the building you point at), and added
the two faculties that were missing: Forestry, which the map data names, and
Biological Sciences, which it does not — that marker sits at the middle of the
road and pond named after the faculty, so it is still placed from real features
rather than guessed. A line now travels the campus continuously, connecting all
nine faculties one after another. The student ID explainer has been removed from
the hero.

**Speed.** The site was slow, and the teacher directory was the reason.

- **Star ratings were the biggest single cost.** Each star was drawn as its own
  icon, ten per row, a thousand rows — several megabytes of identical shapes.
  They are now one small shape reused by the browser.
- **Pages are cached.** Every visit was rebuilding the same page from the
  database. Rendered pages are now kept at Cloudflare's edge.
- **The directory only builds what you can see** — forty teachers at a time,
  with a button for more. Searching and sorting still covers all 1,019 instantly.
- **Each row carries less.** The list was shipping fields only a teacher's own
  page needs.
- **Dropped the Bengali font** until there is Bangla text to set in it.

The teacher directory went from 1.2 MB to 280 KB, and from about 1.2 seconds to
a quarter of a second before the page starts arriving.
