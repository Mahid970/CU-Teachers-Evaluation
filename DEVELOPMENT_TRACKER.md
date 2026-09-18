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
