#!/usr/bin/env node
/**
 * Quiz extractor (Nov 2026 Circle layout).
 *
 * Circle now shows a finished quiz as a results page: every question with its
 * options, the chosen answer and a "Correct"/"Incorrect" verdict. scrape.js
 * gets no quiz content from that page, so this script reads it instead.
 * Run it with an account that has completed (ideally passed) each quiz, in the
 * same logged-in debug Chrome as scrape.js.
 *
 * Usage: node scrape-quiz-results.js <lessonsDir> <quizLessonId> [...]
 *   <lessonsDir> must contain <id>.json from scrape.js (for each lesson URL).
 * Writes <lessonsDir>/../quizzes/<id>.json:
 *   { lessonId, url, title, questions: [{ text, options[], selected, verdict }] }
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

(async () => {
  const [lessonsDir, ...ids] = process.argv.slice(2);
  const outDir = path.join(lessonsDir, "..", "quizzes");
  fs.mkdirSync(outDir, { recursive: true });
  const v = await (await fetch("http://127.0.0.1:9222/json/version")).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null });
  const page = await browser.newPage();
  for (const id of ids) {
    const { url } = JSON.parse(fs.readFileSync(path.join(lessonsDir, `${id}.json`), "utf8"));
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2500));
    const data = await page.evaluate(() => {
      const visible = (e) => e && e.getClientRects().length > 0;
      const title = [...document.querySelectorAll("h1, h2")]
        .find((h) => visible(h) && !/^lesson locked$/i.test(h.textContent.trim()))?.textContent.trim() || "";
      const groups = [...document.querySelectorAll('[role="radiogroup"], [role="group"]')]
        .filter((g) => g.querySelector('[role="radio"], [role="checkbox"]'));
      const questions = groups.map((g) => {
        const id = g.getAttribute("aria-labelledby");
        const legend = (id && document.getElementById(id)) || g.querySelector("legend");
        const items = [...g.querySelectorAll('[role="radio"], [role="checkbox"]')];
        const options = items.map((it) => {
          const lid = it.getAttribute("aria-labelledby");
          return ((lid && document.getElementById(lid)) || it.closest("div")?.parentElement?.querySelector("label"))?.textContent.trim() || "";
        });
        const selected = items.map((it, i) => (it.getAttribute("aria-checked") === "true" ? i : -1)).filter((i) => i >= 0);
        // The verdict banner ("Correct"/"Incorrect") sits just before the field.
        let verdict = null, el = g.closest("[data-compass-field]") || g;
        for (let p = el.previousElementSibling; p && !verdict; p = p.previousElementSibling) {
          const h = p.querySelector("h6"); if (h) verdict = h.textContent.trim();
        }
        return { text: legend?.textContent.trim() || "", options, selected, verdict, multi: items[0]?.getAttribute("role") === "checkbox" };
      });
      return { title, questions };
    });
    fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify({ lessonId: id, url, ...data }, null, 2));
    const wrong = data.questions.filter((q) => q.verdict !== "Correct").length;
    console.log(`${id} | ${data.title} | ${data.questions.length} question(s) | not-correct: ${wrong}`);
  }
  await page.close(); browser.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
