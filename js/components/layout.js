/**
 * layout.js — renders the shared header and footer.
 *
 * Both are rendered from JS rather than fetched as HTML partials so the
 * chrome paints with the rest of the page (no flash of missing navigation)
 * and the active link can be resolved from the current URL.
 */

import { SITE, NAV } from "../config.js";
import { qs, qsa, normalisePath } from "../utils/dom.js";

const ICONS = {
  github:
    '<path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.2c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.53.12-3.18 0 0 1.01-.33 3.3 1.23a11.4 11.4 0 0 1 6 0c2.28-1.56 3.29-1.23 3.29-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z"/>',
  linkedin:
    '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"/>',
  mail: '<path d="M1.5 5.25A2.25 2.25 0 0 1 3.75 3h16.5a2.25 2.25 0 0 1 2.25 2.25v.38l-10.5 6.2L1.5 5.63v-.38Zm0 2.87v10.63A2.25 2.25 0 0 0 3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V8.12l-9.93 5.87a1.5 1.5 0 0 1-1.64 0L1.5 8.12Z"/>',
  calendar:
    '<path d="M7.5 1.5a.75.75 0 0 1 .75.75V3h7.5v-.75a.75.75 0 0 1 1.5 0V3h1.5A2.25 2.25 0 0 1 21 5.25v13.5A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V5.25A2.25 2.25 0 0 1 5.25 3h1.5v-.75a.75.75 0 0 1 .75-.75ZM4.5 8.25v10.5c0 .41.34.75.75.75h13.5c.41 0 .75-.34.75-.75V8.25h-15Z"/>',
  download:
    '<path d="M12 2.25a.75.75 0 0 1 .75.75v10.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75ZM3.75 15a.75.75 0 0 1 .75.75v3c0 .41.34.75.75.75h13.5c.41 0 .75-.34.75-.75v-3a.75.75 0 0 1 1.5 0v3A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75v-3a.75.75 0 0 1 .75-.75Z"/>',
};

const icon = (name, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${ICONS[name]}</svg>`;

function headerMarkup(currentPath) {
  const links = NAV.map((item) => {
    const active = item.match.includes(currentPath);
    return `<li><a href="${item.href}"${item.cta ? ' class="nav-cta"' : ""}${
      active ? ' aria-current="page"' : ""
    }>${item.label}</a></li>`;
  }).join("");

  return `
    <nav class="navbar" aria-label="Primary">
      <div class="nav-container">
        <a href="/" class="logo" aria-label="${SITE.name} — home">
          <span class="logo-mark" aria-hidden="true">${SITE.initials}</span>
          <span>${SITE.name}</span>
        </a>
        <button class="menu-toggle" id="menuToggle" aria-label="Toggle menu"
                aria-expanded="false" aria-controls="navMenu">
          <span></span><span></span><span></span>
        </button>
        <ul class="nav-menu" id="navMenu">${links}</ul>
      </div>
    </nav>`;
}

function footerMarkup() {
  const year = new Date().getFullYear();

  return `
    <footer class="site-footer">
      <div class="shell">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="/" class="logo">
              <span class="logo-mark" aria-hidden="true">${SITE.initials}</span>
              <span>${SITE.name}</span>
            </a>
            <p>${SITE.role} in ${SITE.location}, building web platforms,
               reporting systems and AI-assisted tooling.</p>
          </div>

          <div class="footer-col">
            <h3>Site</h3>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/projects.html">Projects</a></li>
              <li><a href="/blogs.html">Blogs</a></li>
              <li><a href="/meeting.html">Book a call</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h3>Elsewhere</h3>
            <ul>
              <li><a href="${SITE.github}" rel="noopener">GitHub</a></li>
              <li><a href="${SITE.linkedin}" rel="noopener">LinkedIn</a></li>
              <li><a href="mailto:${SITE.email}">Email</a></li>
              <li><a href="${SITE.resume}">Résumé (PDF)</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; ${year} ${SITE.name}. All rights reserved.</span>
          <span>Hand-built with HTML, CSS and vanilla JavaScript.</span>
        </div>
      </div>
    </footer>`;
}

/** Wire up the mobile menu button. */
function initMobileNav() {
  const toggle = qs("#menuToggle");
  const menu = qs("#navMenu");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle("show", open);
    toggle.classList.toggle("active", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () =>
    setOpen(!menu.classList.contains("show")),
  );

  qsa("a", menu).forEach((link) =>
    link.addEventListener("click", () => setOpen(false)),
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("show")) return;
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false);
    }
  });
}

/** Render header/footer into their mount points, if present. */
export function initLayout() {
  const header = qs("#header");
  const footer = qs("#footer");

  if (header) {
    header.innerHTML = headerMarkup(normalisePath(window.location.pathname));
    initMobileNav();
  }

  if (footer) footer.innerHTML = footerMarkup();
}

export { icon };
