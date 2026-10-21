/**
 * projects.js — category filtering, detail modals and deep links.
 *
 * The cards are authored as static HTML (good for crawlers and for a
 * no-JavaScript fallback); this module only layers behaviour on top:
 *
 *   ?category=ai            pre-selects a filter
 *   ?project=just-a-rag     opens that card's modal on load
 *   #just-a-rag             same, for plain anchor links
 */

import { qs, qsa, prefersReducedMotion } from "../utils/dom.js";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

let lastFocused = null;

/* ---------------------------------------------------------- filtering */

function initFilters(grid) {
  const buttons = qsa("[data-filter]");
  if (!buttons.length) return;

  const cards = qsa(".project", grid);
  const empty = qs("#projectsEmpty");

  const apply = (category, { updateUrl = true } = {}) => {
    let shown = 0;

    cards.forEach((card, index) => {
      const categories = (card.dataset.categories || "").split(/\s+/);
      const match = category === "all" || categories.includes(category);
      card.classList.toggle("is-hidden", !match);

      if (match) {
        shown += 1;
        if (!prefersReducedMotion()) {
          card.style.animation = "none";
          // Force a reflow so the animation restarts on every filter change.
          void card.offsetWidth;
          card.style.animation = `rise 0.4s var(--ease) ${Math.min(
            index * 40,
            240,
          )}ms both`;
        }
      }
    });

    buttons.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === category),
      ),
    );

    if (empty) empty.hidden = shown > 0;
    grid.setAttribute("aria-busy", "false");

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (category === "all") url.searchParams.delete("category");
      else url.searchParams.set("category", category);
      history.replaceState(null, "", url);
    }
  };

  buttons.forEach((button) =>
    button.addEventListener("click", () => apply(button.dataset.filter)),
  );

  const initial = new URLSearchParams(window.location.search).get("category");
  const known = buttons.some((button) => button.dataset.filter === initial);
  apply(known ? initial : "all", { updateUrl: false });
}

/* ------------------------------------------------------------- modal */

function initModal(grid) {
  const modal = qs("#projectModal");
  if (!modal) return;

  const dialog = qs(".modal-dialog", modal);
  const body = qs("#projectModalBody", modal);
  const closeBtn = qs(".modal-close", modal);
  const backdrop = qs(".modal-backdrop", modal);

  const open = (card, { updateUrl = true } = {}) => {
    const detail = qs(".project-detail", card);
    if (!detail) return;

    lastFocused = document.activeElement;
    body.innerHTML = detail.innerHTML;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    (qs(FOCUSABLE, body) || closeBtn).focus();

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("project", card.dataset.project);
      history.pushState({ project: card.dataset.project }, "", url);
    }
  };

  const close = ({ updateUrl = true } = {}) => {
    if (!modal.classList.contains("is-open")) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete("project");
      url.hash = "";
      history.replaceState(null, "", url.pathname + url.search);
    }

    if (lastFocused instanceof HTMLElement) lastFocused.focus();
    // Clear after the close transition so the text does not vanish mid-fade.
    window.setTimeout(() => {
      if (!modal.classList.contains("is-open")) body.innerHTML = "";
    }, 300);
  };

  grid.addEventListener("click", (event) => {
    // Never hijack a real link inside a card.
    if (event.target.closest("a")) return;

    const trigger = event.target.closest(".project-open, [data-open-project]");
    if (!trigger) return;

    const card = trigger.closest(".project");
    if (card) open(card);
  });

  closeBtn?.addEventListener("click", () => close());
  backdrop?.addEventListener("click", () => close());

  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      close();
      return;
    }

    if (event.key !== "Tab") return;

    // Keep keyboard focus inside the dialog while it is open.
    const focusable = qsa(FOCUSABLE, dialog).filter(
      (node) => node.offsetParent !== null,
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("popstate", () => {
    const slug = new URLSearchParams(window.location.search).get("project");
    const card = slug && qs(`[data-project="${CSS.escape(slug)}"]`, grid);
    if (card) open(card, { updateUrl: false });
    else close({ updateUrl: false });
  });

  // Deep link on first paint.
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("project") || window.location.hash.slice(1);
  if (slug) {
    const card = qs(`[data-project="${CSS.escape(slug)}"]`, grid);
    if (card) open(card, { updateUrl: false });
  }
}

/* ------------------------------------------------- pointer spotlight */

function initSpotlight(grid) {
  if (prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) {
    return;
  }

  grid.addEventListener("pointermove", (event) => {
    const card = event.target.closest(".project");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    card.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
}

export function initProjects() {
  const grid = qs("#projects");
  if (!grid) return;

  initFilters(grid);
  initModal(grid);
  initSpotlight(grid);
}
