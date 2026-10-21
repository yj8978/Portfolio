# yogeshjirel.com.np

Personal portfolio, project showcase and blog for **Yogesh Jirel**, a software
engineer in Kathmandu, Nepal.

Live at **<https://yogeshjirel.com.np>** — served straight from this repository
by GitHub Pages. No framework, no bundler, no runtime dependencies.

---

## Profile

Software engineer with hands-on experience building web applications, REST
APIs, AI-powered features and database-driven systems. Comfortable owning a
feature from development through deployment.

| | |
| --- | --- |
| Location | Kathmandu, Nepal |
| Email | jirelyogesh@gmail.com |
| GitHub | [yj8978](https://github.com/yj8978) |
| LinkedIn | [yogesh-jirel](https://www.linkedin.com/in/yogesh-jirel-8b9871259) |
| Résumé | [`resources/yogesh_jirel_resume.pdf`](resources/yogesh_jirel_resume.pdf) |

### Experience

**Software Developer** — Intellisoft Nepal Pvt. Ltd. · Remote · Mar 2026 – Aug 2026
- Built features for a Financial Management Information System (FMIS) used by Roads Board Nepal.
- Designed and implemented a secure authentication and login system.
- Delivered a financial reporting system in Laravel/PHP on Oracle, including configurable reports and balance-sheet generation.
- Built reporting workflows for financial data aggregation and fiscal-year comparisons.
- Debugged and optimised backend queries and reporting logic against production features.
- Applied secure backend practices: input validation, access control, protection against common web vulnerabilities.

**Software Developer (Contract)** — American Institute of Technology · Kathmandu · Aug 2025 – Feb 2026
- Maintained WordPress platforms serving 150k monthly users.
- Reduced LCP and render-blocking resources, improving page load speed by 30%+.
- Built custom PHP modules and WordPress plugins for dynamic content management.
- Resolved SQL and PHP issues, improving system stability.
- Integrated AI-powered functionality via external AI APIs.

**Software Engineer** — Oya Inc · 2025 – Present
- Revamping an existing system with a focus on performance and latency.

**Software Developer** — Lets Learn Asia · Kathmandu · Dec 2024 – Nov 2025
- Built education-focused web platforms in PHP with database-driven academic content management.
- Integrated third-party APIs and authentication systems.
- Improved accessibility and SEO structure.
- Led development cycles from implementation through deployment.

**Freelance Developer** — Self-employed · 2024 – Present
- WordPress plugins and themes for clients, plus personal projects taken to release.

### Skills

| Area | Tools |
| --- | --- |
| Languages | Python, JavaScript, SQL, PHP, C++ |
| Backend | FastAPI, Laravel, REST APIs |
| Frontend | JavaScript, React, HTML, CSS |
| Databases | PostgreSQL, Oracle, MySQL, MongoDB |
| DevOps | Linux, Docker, Git, CI/CD |
| AI & automation | AI API integration, LLM applications, AI-assisted development |

### Education

**B.Sc. Computer Science and Information Technology** — Tribhuvan University, 2026.
Coursework: Data Structures & Algorithms, Database Management Systems,
Software Engineering, Artificial Intelligence, Statistics.

---

## Project structure

```
.
├── index.html            Home — about, highlights, skills, experience, projects, education
├── projects.html         Project showcase — category filters, detail modals, deep links
├── meeting.html          Booking page — meeting types, availability, request form
├── blogs.html            Blog index (rendered from posts.json)
├── blog.html             Single post view (?id=<post-id>)
├── posts.json            Blog content
├── style.css             Stylesheet entry point — imports the three layers below
├── styles/
│   ├── base.css          Design tokens, reset, typography, layout primitives, motion
│   ├── components.css    Buttons, cards, nav, footer, filters, modal, forms, timeline
│   └── pages.css         Page composition + responsive breakpoints
├── js/
│   ├── main.js           Single entry point; dispatches on <body data-page="...">
│   ├── config.js         Site constants, navigation, booking configuration
│   ├── utils/dom.js      Small DOM helpers
│   └── components/
│       ├── layout.js     Header + footer rendering, mobile nav
│       ├── reveal.js     Scroll-reveal micro-interactions
│       ├── projects.js   Filtering, detail modals, deep linking
│       ├── scheduler.js  Calendar embed / booking request form / .ics generation
│       └── blog.js       Blog index and post rendering
├── icons/                Favicons and web manifest
├── resources/            Résumé PDF
└── .github/workflows/    Sitemap regeneration on push to main
```

### Conventions

- **One script tag per page.** Every page loads `/js/main.js` as an ES module;
  page-specific code is dispatched from `<body data-page="…">`.
- **Content is static HTML.** Cards and copy live in the markup so crawlers and
  no-JavaScript visitors get the whole page. JavaScript only adds behaviour.
- **Motion is opt-out aware.** All animation is disabled under
  `prefers-reduced-motion: reduce`.
- **Breakpoints:** 1024px (tablet), 900px (sidebar collapse), 768px (mobile
  nav), 560px (small phones).

---

## Running it locally

There is no build step, but the pages use ES modules and `fetch`, so they need
to be served over HTTP rather than opened as `file://`:

```bash
npx http-server . -p 8080 -c-1
# then open http://localhost:8080
```

### Build checks

`scripts/check.mjs` loads every page in headless Chromium and fails on console
errors, uncaught exceptions, failed requests or missing landmark elements:

```bash
node scripts/check.mjs
```

---

## Configuring the booking page

`meeting.html` works with or without a third-party calendar. Everything is
driven by `SCHEDULING` in [`js/config.js`](js/config.js):

```js
export const SCHEDULING = {
  provider: "none",                       // "calcom" | "calendly" | "none"
  calcom:   { username: "yogeshjirel" },
  calendly: { username: "yogeshjirel" },
};
```

- **`"none"` (current)** — no external calendar is connected. The built-in
  request form takes over: it validates the proposed slot, shows it in both the
  visitor's timezone and Kathmandu time, opens a pre-filled email, and
  generates a downloadable `.ics` invite so the slot reaches their calendar
  immediately.
- **`"calcom"` / `"calendly"`** — set the provider and your username, and the
  page embeds that live calendar instead. The event-type slugs come from
  `MEETING_TYPES[].slug` in the same file (`30min`, `45min`, `60min` by
  default) — rename them to match the event types in your account.

Meeting types and advertised working hours are also edited in `js/config.js`
(`MEETING_TYPES` and `AVAILABILITY`).

---

## Adding a blog post

Append an object to `posts.json`:

```json
{
  "id": "url-slug",
  "title": "Post title",
  "excerpt": "One-line summary for the index page.",
  "date": "January 2026",
  "readTime": "6 min read",
  "content": "<p>HTML body.</p>"
}
```

It appears at `/blog.html?id=url-slug` and in the index automatically. Set
`"draft": true` to keep it out of the index and the sitemap.
