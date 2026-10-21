#!/usr/bin/env node
/**
 * check.mjs — build checks for a site with no build step.
 *
 * 1. Static pass: every page's script/style/href target exists on disk, and
 *    every JavaScript module parses.
 * 2. Browser pass: each page is loaded in headless Chromium and fails on any
 *    console error, uncaught exception, failed network request, or missing
 *    landmark. Interactions (filters, modal, deep links, booking form) are
 *    exercised too.
 *
 * The browser pass is skipped with a warning if Playwright is not installed.
 *
 *   node scripts/check.mjs
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8411;

const PAGES = [
  "/index.html",
  "/projects.html",
  "/meeting.html",
  "/blogs.html",
  "/blog.html?id=money-as-a-tool",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

const failures = [];
const warnings = [];

const fail = (scope, message) => failures.push(`${scope}: ${message}`);
const warn = (scope, message) => warnings.push(`${scope}: ${message}`);

/* ------------------------------------------------------ static server */

function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";

    const file = join(ROOT, path);

    // Keep requests inside the project directory.
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": MIME[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    }
  });

  return new Promise((done) => server.listen(PORT, () => done(server)));
}

/* --------------------------------------------------------- static pass */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

async function staticPass() {
  const files = walk(ROOT);

  // Every JS module must parse.
  for (const file of files.filter(
    (f) => f.endsWith(".js") || f.endsWith(".mjs"),
  )) {
    try {
      execSync(`node --check ${JSON.stringify(file)}`, { stdio: "pipe" });
    } catch (error) {
      fail(
        "parse",
        `${file.replace(ROOT, ".")} — ${error.stderr?.toString().trim()}`,
      );
    }
  }

  // Every local asset referenced by an HTML page must exist.
  const htmlFiles = files.filter((f) => f.endsWith(".html"));
  const refPattern = /(?:src|href)="(\/[^"#?]+)"/g;

  for (const file of htmlFiles) {
    const source = await readFile(file, "utf8");
    for (const [, ref] of source.matchAll(refPattern)) {
      if (ref === "/") continue;
      try {
        await stat(join(ROOT, ref));
      } catch {
        fail("asset", `${file.replace(ROOT, ".")} references missing ${ref}`);
      }
    }
    if (!/<body[^>]*data-page="/.test(source)) {
      fail("markup", `${file.replace(ROOT, ".")} has no data-page on <body>`);
    }
    if (!source.includes('id="header"') || !source.includes('id="footer"')) {
      fail(
        "markup",
        `${file.replace(ROOT, ".")} is missing a header/footer mount`,
      );
    }
  }

  // Every @import target in the stylesheet entry point must exist.
  const css = await readFile(join(ROOT, "style.css"), "utf8");
  for (const [, ref] of css.matchAll(/@import url\("([^"]+)"\)/g)) {
    try {
      await stat(join(ROOT, ref));
    } catch {
      fail("asset", `style.css imports missing ${ref}`);
    }
  }

  // posts.json must be valid and complete.
  const posts = JSON.parse(await readFile(join(ROOT, "posts.json"), "utf8"));
  posts.forEach((post, index) => {
    for (const key of ["id", "title", "date", "content"]) {
      if (!post[key]) fail("posts.json", `post #${index} is missing "${key}"`);
    }
  });

  console.log(
    `  parsed ${files.filter((f) => f.endsWith(".js")).length} JS modules`,
  );
  console.log(`  verified asset references in ${htmlFiles.length} pages`);
  console.log(`  validated ${posts.length} blog posts`);
}

/* -------------------------------------------------------- browser pass */

async function loadPlaywright() {
  // A CommonJS build imported from ESM puts its exports on `.default`.
  const unwrap = (module) => (module?.chromium ? module : module?.default);

  try {
    return unwrap(await import("playwright"));
  } catch {
    /* fall through to a global install */
  }

  try {
    const root = execSync("npm root -g", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return unwrap(
      await import(pathToFileURL(join(root, "playwright", "index.js")).href),
    );
  } catch {
    return null;
  }
}

async function browserPass() {
  const playwright = await loadPlaywright();

  if (!playwright) {
    warn("browser", "Playwright not installed — browser checks skipped");
    return;
  }

  const browser = await playwright.chromium.launch();

  for (const page of PAGES) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const tab = await context.newPage();
    const problems = [];

    tab.on("console", (message) => {
      if (message.type() === "error")
        problems.push(`console: ${message.text()}`);
    });
    tab.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
    tab.on("requestfailed", (request) => {
      const url = request.url();
      // Third-party fonts are not part of the build.
      if (url.includes("fonts.g") || url.includes("avatars.githubusercontent"))
        return;
      problems.push(`request failed: ${url}`);
    });

    const response = await tab.goto(`http://localhost:${PORT}${page}`, {
      waitUntil: "networkidle",
    });

    if (!response?.ok()) fail(page, `HTTP ${response?.status()}`);

    // Shared chrome must have rendered.
    const navLinks = await tab.locator(".navbar .nav-menu a").count();
    if (navLinks < 4)
      fail(page, `header rendered ${navLinks} nav links, expected 4+`);
    if (!(await tab.locator(".site-footer").count()))
      fail(page, "footer did not render");
    if (!(await tab.locator("main").count())) fail(page, "no <main> landmark");

    await checkPage(page, tab);
    await assertEverythingRevealed(page, tab);

    if (problems.length) problems.forEach((problem) => fail(page, problem));
    else console.log(`  ✓ ${page}`);

    await context.close();
  }

  // The open mobile menu and the sticky header must paint above page content.
  // Hit testing follows paint order, so elementFromPoint catches a z-index
  // regression that a screenshot-free structural check would miss.
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 700 },
    });
    const tab = await context.newPage();
    await tab.goto(`http://localhost:${PORT}/projects.html`, {
      waitUntil: "networkidle",
    });
    await tab.click("#menuToggle");
    await tab.waitForTimeout(300);

    const result = await tab.evaluate(() => {
      const menu = document.querySelector(".nav-menu");
      if (!menu || !menu.classList.contains("show")) {
        return { error: "menu did not open" };
      }

      const items = [...menu.querySelectorAll("li")];
      const menuBox = menu.getBoundingClientRect();
      const last = items.at(-1).getBoundingClientRect();
      if (last.bottom > menuBox.bottom + 1) {
        return { error: "last item overflows the panel" };
      }

      // Every item must be the topmost element at its own centre.
      for (const item of items) {
        const box = item.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        if (!item.contains(hit)) {
          return {
            error: `"${item.textContent.trim()}" is painted over by ${
              hit?.className || hit?.tagName
            }`,
          };
        }
      }

      return { ok: true, items: items.length };
    });

    if (result.error) fail("mobile menu", result.error);
    else console.log(`  ✓ mobile menu — ${result.items} items paint on top`);

    // The sticky header must stay above content once the page is scrolled.
    await tab.keyboard.press("Escape");
    await tab.evaluate(() => window.scrollTo(0, 600));
    await tab.waitForTimeout(250);

    const logoOnTop = await tab.evaluate(() => {
      const logo = document.querySelector(".navbar .logo");
      const box = logo.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return logo.contains(hit) && box.top >= 0;
    });

    if (!logoOnTop)
      fail(
        "sticky header",
        "navbar did not stay pinned above scrolled content",
      );
    else console.log("  ✓ sticky header stays above scrolled content");

    await context.close();
  }

  // Mobile + tablet sweep: no horizontal overflow at any breakpoint.
  for (const [label, width] of [
    ["mobile", 390],
    ["tablet", 820],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
    });
    const tab = await context.newPage();

    for (const page of PAGES) {
      await tab.goto(`http://localhost:${PORT}${page}`, { waitUntil: "load" });
      const overflow = await tab.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      if (overflow > 1)
        fail(`${page} @${label}`, `horizontal overflow of ${overflow}px`);
    }

    console.log(`  ✓ ${label} (${width}px) — no horizontal overflow`);
    await context.close();
  }

  await browser.close();
}

/** Scroll the whole page; nothing marked data-reveal may stay invisible. */
async function assertEverythingRevealed(page, tab) {
  await tab.evaluate(async () => {
    // Smooth scrolling animates, which would make this walk racy.
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";

    const step = window.innerHeight * 0.75;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((done) => setTimeout(done, 80));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((done) => setTimeout(done, 80));

    document.documentElement.style.scrollBehavior = previous;
  });
  await tab.waitForTimeout(500);

  const hidden = await tab.$$eval("[data-reveal]:not(.is-visible)", (nodes) =>
    nodes.map((node) => node.id || node.className || node.tagName),
  );

  if (hidden.length) {
    fail(
      page,
      `${hidden.length} reveal element(s) never shown: ${hidden.join(", ")}`,
    );
  }
}

/** Page-specific interaction checks. */
async function checkPage(page, tab) {
  if (page.startsWith("/index")) {
    const sections = await tab.locator("main .card").count();
    if (sections < 7)
      fail(page, `only ${sections} sections rendered, expected 7+`);
    const visible = await tab.locator("[data-reveal].is-visible").count();
    if (!visible) fail(page, "no scroll-reveal element became visible");
  }

  if (page.startsWith("/projects")) {
    const total = await tab.locator(".project").count();
    if (total < 6) fail(page, `only ${total} project cards, expected 6+`);

    // Filtering.
    await tab.click('[data-filter="ai"]');
    await tab.waitForTimeout(150);
    const shown = await tab.locator(".project:not(.is-hidden)").count();
    if (shown !== 1)
      fail(page, `"ai" filter showed ${shown} cards, expected 1`);
    if (!tab.url().includes("category=ai"))
      fail(page, "filter did not update the URL");

    await tab.click('[data-filter="all"]');
    await tab.waitForTimeout(150);
    if ((await tab.locator(".project:not(.is-hidden)").count()) !== total) {
      fail(page, '"all" filter did not restore every card');
    }

    // Modal + deep link.
    await tab.locator('[data-project="mysahapathi"] .project-open').click();
    await tab.waitForTimeout(200);
    if (!(await tab.locator("#projectModal.is-open").count())) {
      fail(page, "modal did not open");
    }
    if (!tab.url().includes("project=mysahapathi")) {
      fail(page, "modal did not deep-link into the URL");
    }
    if (!(await tab.locator("#projectModalBody h2").count())) {
      fail(page, "modal body is empty");
    }

    await tab.keyboard.press("Escape");
    await tab.waitForTimeout(350);
    if (await tab.locator("#projectModal.is-open").count()) {
      fail(page, "Escape did not close the modal");
    }

    // Direct deep link on load.
    await tab.goto(`http://localhost:${PORT}/projects.html?project=pdoom`, {
      waitUntil: "networkidle",
    });
    if (!(await tab.locator("#projectModal.is-open").count())) {
      fail(page, "?project= deep link did not open on load");
    }
  }

  if (page.startsWith("/meeting")) {
    if ((await tab.locator(".meet-type").count()) !== 3) {
      fail(page, "meeting types did not render");
    }
    if (!(await tab.locator("#availabilityList li").count())) {
      fail(page, "availability did not render");
    }
    if ((await tab.locator("#meetingType option").count()) !== 3) {
      fail(page, "meeting type select was not populated");
    }

    await tab.fill("#meetingDate", "2030-03-14");
    await tab.fill("#meetingTime", "10:30");
    await tab.waitForTimeout(150);

    const preview = await tab.locator("#slotPreview").innerText();
    if (!/Kathmandu/i.test(preview)) {
      fail(page, `slot preview did not convert timezones (got "${preview}")`);
    }

    // The .ics download must produce a well-formed calendar file.
    await tab.fill("#guestName", "Test Guest");
    await tab.fill("#guestEmail", "guest@example.com");

    const [ics] = await Promise.all([
      tab.waitForEvent("download", { timeout: 5000 }).catch(() => null),
      tab.click("#downloadIcs"),
    ]);

    if (!ics) {
      fail(page, "no .ics file was generated");
    } else {
      const stream = await ics.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString();
      for (const marker of [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "DTSTART:",
        "END:VCALENDAR",
      ]) {
        if (!text.includes(marker)) fail(page, `.ics is missing ${marker}`);
      }
    }
  }

  if (page.startsWith("/blogs")) {
    const cards = await tab.locator(".blog-card").count();
    if (!cards) fail(page, "blog index rendered no posts");
  }

  if (page.startsWith("/blog.html")) {
    const title = await tab.locator("#title").innerText();
    if (!title || /not found|loading/i.test(title)) {
      fail(page, `post did not render (title: "${title}")`);
    }
    if (!(await tab.locator("#content p").count()))
      fail(page, "post body is empty");
  }
}

/* ----------------------------------------------------------------- run */

const server = await startServer();

console.log("\nStatic checks");
await staticPass();

console.log("\nBrowser checks");
await browserPass();

server.close();

if (warnings.length) {
  console.log("\nWarnings");
  warnings.forEach((warning) => console.log(`  ! ${warning}`));
}

if (failures.length) {
  console.log(`\n✗ ${failures.length} problem(s) found\n`);
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exit(1);
}

console.log("\n✓ All checks passed\n");
