#!/usr/bin/env node
/**
 * Circle Course Scraper v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes from v1:
 *   • Unique filenames per lesson (uses lesson ID from URL, not the title slug
 *     — old bug: every lesson shared the same slug, so each overwrote the last)
 *   • Better content selectors (Circle uses data-testid attributes)
 *   • Resume support: already-scraped lessons are skipped
 *   • Stripe iframes are filtered out (they're auth artifacts, not real videos)
 *   • Clearer video summary at the end
 *
 * SETUP (one-time):
 *   cd scripts/circle-scraper
 *   npm install
 *
 * USAGE:
 *   1. Launch Chrome with remote debugging (keep this window open):
 *        Windows: "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=C:\tmp\chrome-debug
 *        Mac:     /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
 *   2. In that Chrome window, log into https://community.effectiefaltruisme.nl
 *   3. node scrape.js
 *
 * OUTPUT (written to ./output, or $SCRAPE_OUT):
 *   courses/effectief-altrusme/
 *     course.json              ← updated with real lesson titles after scraping
 *     lessons/
 *       3639406.json           ← one file per lesson, named by lesson ID
 *       3639473.json
 *       …
 *   assets/
 *     images/
 *     files/
 */

const puppeteer = require("puppeteer-core"); // connects to your own Chrome; no bundled browser needed
const fs        = require("fs");
const path      = require("path");
const https     = require("https");
const http      = require("http");
const { URL }   = require("url");

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const CONFIG = {
  CIRCLE_COMMUNITY_URL: "https://community.effectiefaltruisme.nl",
  COURSE_URL:           "https://community.effectiefaltruisme.nl/c/intro-course-march-2026",
  OUTPUT_DIR:           process.env.SCRAPE_OUT || path.join(__dirname, "output"), // gitignored
  CHROME_DEBUG_PORT:    9222,
  LESSON_WAIT_MS:       2500,             // wait after page load for dynamic content
  DELAY_BETWEEN_MS:     900,              // pause between lessons (be polite)
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(...parts) {
  const p = path.join(...parts);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/** Derive a safe filename from a URL (short hash prefix + original basename). */
function safeFilename(rawUrl) {
  try {
    const u    = new URL(rawUrl);
    const base = path.basename(u.pathname) || `file-${Date.now()}`;
    const hash = Buffer.from(rawUrl).toString("base64").slice(0, 6).replace(/[/+=]/g, "x");
    return `${hash}-${base}`;
  } catch {
    return `file-${Date.now()}`;
  }
}

/** Extract the numeric lesson ID from a Circle lesson URL. */
function lessonIdFromUrl(url) {
  const m = url.match(/\/lessons\/(\d+)/);
  return m ? m[1] : null;
}

/** Extract the numeric section ID from a Circle lesson URL. */
function sectionIdFromUrl(url) {
  const m = url.match(/\/sections\/(\d+)/);
  return m ? m[1] : null;
}

async function downloadFile(url, destPath, cookies) {
  return new Promise((resolve, reject) => {
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    let parsedUrl;
    try { parsedUrl = new URL(url); }
    catch { return reject(new Error("Invalid URL: " + url)); }

    const options = {
      hostname: parsedUrl.hostname,
      path:     parsedUrl.pathname + parsedUrl.search,
      headers:  {
        Cookie:     cookieHeader,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer":  CONFIG.CIRCLE_COMMUNITY_URL,
      },
    };

    const client = url.startsWith("https") ? https : http;
    const file   = fs.createWriteStream(destPath);

    const req = client.get(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(destPath, () => {});
        return downloadFile(res.headers.location, destPath, cookies).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(destPath); });
    });
    req.on("error", (err) => { file.close(); fs.unlink(destPath, () => {}); reject(err); });
  });
}

// ─── Connect to browser ───────────────────────────────────────────────────────

async function connectToBrowser() {
  console.log(`\n🔌 Connecting to Chrome on port ${CONFIG.CHROME_DEBUG_PORT}…`);
  const endpoint = await new Promise((resolve, reject) => {
    http.get(`http://localhost:${CONFIG.CHROME_DEBUG_PORT}/json/version`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try   { resolve(JSON.parse(data).webSocketDebuggerUrl); }
        catch { reject(new Error("Could not parse Chrome debug response.")); }
      });
    }).on("error", () => reject(new Error(
      `Cannot connect to Chrome on port ${CONFIG.CHROME_DEBUG_PORT}.\n` +
      `Start it with:\n` +
      `  Windows: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${CONFIG.CHROME_DEBUG_PORT} --user-data-dir=C:\\tmp\\chrome-debug\n` +
      `  Mac:     open -a "Google Chrome" --args --remote-debugging-port=${CONFIG.CHROME_DEBUG_PORT} --user-data-dir=/tmp/chrome-debug`
    )));
  });

  const browser = await puppeteer.connect({ browserWSEndpoint: endpoint });
  console.log("  ✓ Connected");
  return browser;
}

// ─── Course structure ─────────────────────────────────────────────────────────

/**
 * Visit the course overview page and collect all lesson URLs.
 * Strategy: find every <a> whose href matches the lesson URL pattern
 * /sections/{id}/lessons/{id}. This is more reliable than class-name matching.
 */
async function getCourseStructure(page) {
  console.log(`\n📚 Loading course overview page…`);
  await page.goto(CONFIG.COURSE_URL, { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));

  // Expand any collapsed sections
  const toggles = await page.$$('[aria-expanded="false"]');
  for (const t of toggles) {
    try { await t.click(); await new Promise((r) => setTimeout(r, 300)); } catch {}
  }
  if (toggles.length) await new Promise((r) => setTimeout(r, 800));

  const result = await page.evaluate((courseUrl) => {
    // Collect all links whose href contains /sections/.../lessons/...
    const lessonLinks = [];
    const seen        = new Set();
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.href;
      if (
        href.includes("/sections/") &&
        href.includes("/lessons/")  &&
        !seen.has(href)
      ) {
        seen.add(href);
        lessonLinks.push({
          url:   href,
          title: a.textContent?.trim() || href,
        });
      }
    });

    // Group by section ID from the URL
    const sectionMap = {};
    lessonLinks.forEach((l) => {
      const m         = l.url.match(/\/sections\/(\d+)/);
      const sectionId = m ? m[1] : "unknown";
      if (!sectionMap[sectionId]) sectionMap[sectionId] = [];
      sectionMap[sectionId].push(l);
    });

    // Build modules array in section-ID order
    const modules = Object.entries(sectionMap).map(([sectionId, lessons]) => ({
      title:   `Section ${sectionId}`,
      lessons,
    }));

    return { modules, total: lessonLinks.length };
  }, CONFIG.COURSE_URL);

  console.log(`  ✓ Found ${result.total} lesson link(s) across ${result.modules.length} section(s)`);

  if (result.total === 0) {
    console.log("\n  ⚠ No lesson links found — saving debug-page.html for diagnosis.");
    const html = await page.content();
    fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, "debug-page.html"), html);
    console.log("  → Open debug-page.html and look for lesson links; share with Claude for selector fixes.");
  }

  return result.modules;
}

// ─── Scrape a single lesson ───────────────────────────────────────────────────

async function scrapeLesson(page, lessonUrl, cookies) {
  await page.goto(lessonUrl, { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((r) => setTimeout(r, CONFIG.LESSON_WAIT_MS));

  const data = await page.evaluate(() => {
    // Circle lesson content landmarks (based on real scraped HTML)
    const viewEl    = document.querySelector('[data-testid="view-lesson-content"]');
    const contentEl = document.querySelector('[data-testid="dripped-lesson-content"]') || viewEl;
    const editorEl  = document.querySelector('[data-testid="tip-tap-editor-content"]');

    // Title lives in a heading inside the lesson header block. Circle also renders a
    // hidden "Lesson locked" heading on every lesson page (Nov 2026); skip that one
    // and any other heading that isn't visible.
    const headings = [...(viewEl || document).querySelectorAll("h1, h2"), ...document.querySelectorAll("h1, h2")];
    const titleEl = headings.find((h) => {
      const text = h.textContent?.trim() || "";
      return text && !/^lesson locked$/i.test(text) && h.getClientRects().length > 0;
    });
    const title   = titleEl?.textContent?.trim() || document.title;

    // "Lesson N of M" counter, useful for the video summary
    const counter = viewEl?.querySelector("span")?.textContent?.trim() || "";

    // HTML content — prefer the TipTap editor div (clean prose)
    const html = editorEl?.innerHTML || contentEl?.innerHTML || "";

    // Images inside the content
    const images = [];
    (editorEl || contentEl)?.querySelectorAll("img[src]").forEach((img) => {
      if (!img.src.startsWith("data:")) images.push({ src: img.src, alt: img.alt || "" });
    });

    // Downloadable file attachments
    const files    = [];
    const fileExts = ["pdf", "zip", "docx", "xlsx", "pptx", "mp4", "mp3", "csv", "txt", "png", "jpg", "jpeg", "gif", "svg", "webp"];
    (editorEl || contentEl)?.querySelectorAll("a[href]").forEach((a) => {
      const href = a.href;
      const ext  = href.split("?")[0].split(".").pop()?.toLowerCase();
      if (ext && fileExts.includes(ext) && !href.includes("/sign_in")) {
        files.push({ url: href, label: a.textContent?.trim() || href });
      }
    });

    // Video embeds — filter out Stripe iframes (auth artifacts, not real videos)
    const videos = [];
    document.querySelectorAll("iframe[src]").forEach((iframe) => {
      if (!iframe.src.includes("stripe.com") && !iframe.src.includes("js.stripe")) {
        videos.push({ type: "embed", src: iframe.src });
      }
    });
    document.querySelectorAll("video source[src], video[src]").forEach((v) => {
      const src = v.src || v.getAttribute("src");
      if (src) videos.push({ type: "video", src });
    });

    return { title, counter, html, images, files, videos };
  });

  // Download images
  const imagesDir  = ensureDir(CONFIG.OUTPUT_DIR, "assets", "images");
  const localImages = [];
  for (const img of data.images) {
    try {
      const filename = safeFilename(img.src);
      const dest     = path.join(imagesDir, filename);
      if (!fs.existsSync(dest)) await downloadFile(img.src, dest, cookies);
      localImages.push({ ...img, localPath: `/assets/images/${filename}` });
    } catch {
      console.warn(`    ⚠ Skipped image: ${img.src.slice(0, 80)}`);
      localImages.push(img);
    }
  }

  // Download file attachments
  const filesDir  = ensureDir(CONFIG.OUTPUT_DIR, "assets", "files");
  const localFiles = [];
  for (const file of data.files) {
    try {
      const filename = safeFilename(file.url);
      const dest     = path.join(filesDir, filename);
      if (!fs.existsSync(dest)) await downloadFile(file.url, dest, cookies);
      localFiles.push({ ...file, localPath: `/assets/files/${filename}` });
    } catch {
      console.warn(`    ⚠ Skipped file: ${file.url.slice(0, 80)}`);
      localFiles.push(file);
    }
  }

  // Rewrite image URLs in the HTML to their local paths
  let html = data.html;
  for (const img of localImages) {
    if (img.localPath) html = html.replaceAll(img.src, img.localPath);
  }

  return {
    title:     data.title,
    counter:   data.counter,   // e.g. "Lesson 3 of 54"
    url:       lessonUrl,
    html,
    images:    localImages,
    files:     localFiles,
    videos:    data.videos,
    scrapedAt: new Date().toISOString(),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const lessonsDir = ensureDir(CONFIG.OUTPUT_DIR, "courses", "effectief-altrusme", "lessons");
  ensureDir(CONFIG.OUTPUT_DIR, "assets", "images");
  ensureDir(CONFIG.OUTPUT_DIR, "assets", "files");

  let browser;
  try {
    browser = await connectToBrowser();

    const pages = await browser.pages();
    const page  = pages[0] || (await browser.newPage());
    await page.setViewport({ width: 1280, height: 900 });

    // Verify login
    await page.goto(CONFIG.CIRCLE_COMMUNITY_URL, { waitUntil: "networkidle2", timeout: 30000 });
    const isLoggedIn = await page.evaluate(
      () => !document.querySelector('a[href*="sign_in"]')
    );
    if (!isLoggedIn) {
      console.error("❌  Not logged in. Log into Circle in the debug Chrome window first, then re-run.");
      process.exit(1);
    }
    console.log("  ✓ Logged in");

    const cookies = await page.cookies();

    // ── Get lesson list from the course overview page ──────────────────────
    const modules = await getCourseStructure(page);
    if (!modules.length || modules.every((m) => !m.lessons.length)) {
      console.error("❌  No lessons found. See debug-page.html for the raw page HTML.");
      process.exit(1);
    }

    const allLessons = modules.flatMap((m) => m.lessons);
    console.log(`\n▶ Scraping ${allLessons.length} lessons…\n`);

    // ── Scrape each lesson ─────────────────────────────────────────────────
    const scrapedMeta  = []; // for updating course.json at the end
    const videoSummary = []; // lessons with non-Stripe video iframes
    let   done = 0, skipped = 0, failed = 0;

    for (let i = 0; i < allLessons.length; i++) {
      const lesson    = allLessons[i];
      const lessonId  = lessonIdFromUrl(lesson.url);
      const sectionId = sectionIdFromUrl(lesson.url);
      const num       = `${i + 1}/${allLessons.length}`;

      if (!lessonId) {
        console.warn(`  ⚠ [${num}] Cannot parse lesson ID from: ${lesson.url}`);
        failed++;
        continue;
      }

      const outFile = path.join(lessonsDir, `${lessonId}.json`);

      // Resume: skip already-scraped lessons
      if (fs.existsSync(outFile)) {
        const existing = JSON.parse(fs.readFileSync(outFile, "utf-8"));
        console.log(`  ⏭  [${num}] Skip (already scraped): ${existing.title}`);
        scrapedMeta.push({ lessonId, sectionId, title: existing.title, url: lesson.url,
          videoCount: existing.videos?.length || 0, fileCount: existing.files?.length || 0, imageCount: existing.images?.length || 0 });
        if (existing.videos?.length) {
          videoSummary.push({ num: i + 1, lessonId, counter: existing.counter, title: existing.title, url: lesson.url, videos: existing.videos });
        }
        skipped++;
        continue;
      }

      process.stdout.write(`  📄 [${num}] Scraping ${lessonId}… `);
      try {
        const lessonData = await scrapeLesson(page, lesson.url, cookies);

        writeJSON(outFile, lessonData);
        console.log(`"${lessonData.title}" — ${lessonData.files.length} file(s), ${lessonData.videos.length} video(s)`);

        scrapedMeta.push({ lessonId, sectionId, title: lessonData.title, url: lesson.url,
          videoCount: lessonData.videos.length, fileCount: lessonData.files.length, imageCount: lessonData.images.length });

        if (lessonData.videos.length) {
          videoSummary.push({ num: i + 1, lessonId, counter: lessonData.counter, title: lessonData.title, url: lesson.url, videos: lessonData.videos });
        }

        done++;
        await new Promise((r) => setTimeout(r, CONFIG.DELAY_BETWEEN_MS));

      } catch (err) {
        console.log(`FAILED — ${err.message}`);
        scrapedMeta.push({ lessonId, sectionId, title: lesson.title, url: lesson.url, error: err.message });
        failed++;
      }
    }

    // ── Write updated course.json ──────────────────────────────────────────
    const courseJsonPath = path.join(CONFIG.OUTPUT_DIR, "courses", "effectief-altrusme", "course.json");
    const courseJson = {
      title:     "Effectief Altruïsme — Intro Course",
      slug:      "effectief-altrusme",
      sourceUrl: CONFIG.COURSE_URL,
      modules:   modules.map((mod) => ({
        title:   mod.title,
        lessons: scrapedMeta
          .filter((l) => l.sectionId === sectionIdFromUrl(mod.lessons[0]?.url))
          .map((l) => ({
            title:      l.title || `Lesson ${l.lessonId}`,
            lessonId:   l.lessonId,
            sectionId:  l.sectionId,
            url:        l.url,
            videoCount: l.videoCount || 0,
            fileCount:  l.fileCount  || 0,
            imageCount: l.imageCount || 0,
            ...(l.error ? { error: l.error } : {}),
          })),
      })),
      scrapedAt: new Date().toISOString(),
    };
    writeJSON(courseJsonPath, courseJson);

    // ── Summary ───────────────────────────────────────────────────────────
    console.log(`\n─────────────────────────────────────────────────`);
    console.log(`✅  Done — ${done} scraped, ${skipped} skipped, ${failed} failed`);
    console.log(`   Lessons: ${lessonsDir}`);

    if (videoSummary.length) {
      console.log(`\n🎬  Lessons with video embeds — find these on Circle:`);
      console.log(`   (Each entry below is one lesson that contains a video.)`);
      videoSummary.forEach((v) => {
        console.log(`\n   Lesson ${v.num}: "${v.title}"  [${v.counter}]`);
        console.log(`   Circle URL: ${v.url}`);
        v.videos.forEach((vid) =>
          console.log(`   Embed src:  ${vid.src.slice(0, 120)}`)
        );
      });
    } else {
      console.log(`\n🎬  No video embeds detected (videos may load after user interaction).`);
      console.log(`   To find videos: open each lesson on Circle and look for the video player.`);
    }

  } finally {
    if (browser) browser.disconnect();
  }
}

main().catch((err) => {
  console.error("\n❌  Fatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
