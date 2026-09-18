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
