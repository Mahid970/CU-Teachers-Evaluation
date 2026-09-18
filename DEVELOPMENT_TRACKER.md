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
