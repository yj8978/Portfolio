/**
 * reveal.js — scroll-triggered entrance animations.
 *
 * Elements marked with `data-reveal` fade and rise into place the first time
 * they enter the viewport. Siblings inside `data-reveal-group` are staggered.
 * Everything is skipped when the visitor prefers reduced motion.
 *
 * Content rendered after boot (meeting types, blog cards) must be handed to
 * `observe()` so it animates in too instead of staying at opacity 0.
 */

import { qsa, prefersReducedMotion } from "../utils/dom.js";

const STAGGER_MS = 70;
const MAX_STAGGER_MS = 420;

let observer = null;

/** Show everything immediately — used when motion is off or IO is missing. */
const showAll = (scope) =>
  qsa("[data-reveal]", scope).forEach((node) =>
    node.classList.add("is-visible"),
  );

/** Give each child of a reveal group an increasing delay. */
function stagger(scope) {
  const groups = scope.matches?.("[data-reveal-group]")
    ? [scope, ...qsa("[data-reveal-group]", scope)]
    : qsa("[data-reveal-group]", scope);

  groups.forEach((group) => {
    qsa(":scope > [data-reveal]", group).forEach((child, index) => {
      child.style.setProperty(
        "--reveal-delay",
        `${Math.min(index * STAGGER_MS, MAX_STAGGER_MS)}ms`,
      );
    });
  });
}

/**
 * Start watching every `[data-reveal]` inside `scope`.
 * Safe to call repeatedly; already-visible nodes are left alone.
 */
export function observe(scope = document) {
  if (!observer) {
    showAll(scope);
    return;
  }

  stagger(scope);
  qsa("[data-reveal]", scope).forEach((node) => {
    if (!node.classList.contains("is-visible")) observer.observe(node);
  });
}

export function initReveal() {
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    showAll(document);
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );

  observe(document);
}
