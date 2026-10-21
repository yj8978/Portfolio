/**
 * main.js — single entry point for every page.
 *
 * Shared chrome and motion are initialised everywhere; page-specific modules
 * are dispatched from `<body data-page="...">`, so each page ships one script
 * tag and no page ever runs another page's code.
 */

import { initLayout } from "./components/layout.js";
import { initReveal } from "./components/reveal.js";
import { initProjects } from "./components/projects.js";
import { initScheduler } from "./components/scheduler.js";
import { initBlogList, initBlogPost } from "./components/blog.js";
import { qs, qsa, prefersReducedMotion } from "./utils/dom.js";

const PAGES = {
  home: () => initProjects(),
  projects: () => initProjects(),
  meeting: () => initScheduler(),
  blogs: () => initBlogList(),
  blog: () => initBlogPost(),
};

/** Anchor links scroll smoothly and leave room for the sticky header. */
function initSmoothScroll() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute("href").slice(1);
    if (!id) return;

    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    history.replaceState(null, "", `#${id}`);
  });
}

/** Fill every [data-year] node with the current year. */
function initYear() {
  const year = String(new Date().getFullYear());
  qsa("[data-year]").forEach((node) => {
    node.textContent = year;
  });
}

function boot() {
  initLayout();
  initReveal();
  initSmoothScroll();
  initYear();

  const page = document.body.dataset.page;
  const init = PAGES[page];

  if (init) {
    try {
      init();
    } catch (error) {
      console.error(`Failed to initialise page "${page}":`, error);
    }
  }

  // Avoid first-paint animations replaying on back/forward navigation.
  document.body.classList.add("is-ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

export { qs };
