# Circle scraper

Copies the Intro Course lessons (text, images, PDFs) from
https://community.effectiefaltruisme.nl/c/intro-course-march-2026 into JSON files the site can use.
It drives **your own Chrome window**, so it uses your Circle login and never sees your password.

## Run it

```bash
cd scripts/circle-scraper
npm install
```

1. Start a separate Chrome with remote debugging (PowerShell):
   ```powershell
   Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" "--remote-debugging-port=9222 --user-data-dir=C:\tmp\chrome-debug"
   ```
2. In that window, log in to https://community.effectiefaltruisme.nl and open the course once.
3. Run `node scrape.js`. Output goes to `./output/` (gitignored), or to `$SCRAPE_OUT`.

Already-scraped lessons in the output folder are skipped, so a crashed run can be resumed.
Delete `output/` for a completely fresh scrape.

## Bringing a scrape into the site

The site reads `content/lessons/<lessonId>.json` and `public/assets/files/`. Week order and
lesson IDs live in `src/lib/lessons.ts` (`WEEK_DEFS`); quiz answers in `src/lib/quiz-answers.ts`.
Compare the new output with `content/lessons/` first, then copy over what changed. Changed quiz
questions need their correct answers checked again.
