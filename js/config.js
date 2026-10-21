/**
 * config.js — single source of truth for site-wide values.
 * Edit this file to repoint links or switch the booking provider.
 */

export const SITE = {
  name: "Yogesh Jirel",
  initials: "YJ",
  role: "Software Engineer",
  origin: "https://yogeshjirel.com.np",
  email: "jirelyogesh@gmail.com",
  phone: "+977 9818830215",
  location: "Kathmandu, Nepal",
  timezone: "Asia/Kathmandu",
  timezoneLabel: "NPT (UTC+5:45)",
  github: "https://github.com/yj8978",
  linkedin: "https://www.linkedin.com/in/yogesh-jirel-8b9871259",
  resume: "/resources/yogesh_jirel_resume.pdf",
  avatar: "https://avatars.githubusercontent.com/u/119278433?v=4",
};

export const NAV = [
  { label: "Home", href: "/", match: ["/", "/index.html"] },
  { label: "Projects", href: "/projects.html", match: ["/projects.html"] },
  { label: "Blogs", href: "/blogs.html", match: ["/blogs.html", "/blog.html"] },
  {
    label: "Book a call",
    href: "/meeting.html",
    match: ["/meeting.html"],
    cta: true,
  },
];

/**
 * Booking configuration.
 *
 * provider:
 *   "calcom"   — embeds cal.com. Set calcom.username, then each type's `slug`.
 *   "calendly" — embeds calendly. Set calendly.username, then each type's `slug`.
 *   "none"     — no third-party calendar connected; the built-in request form
 *                is used instead (mailto + downloadable .ics invite).
 *
 * Switching provider is the only change needed — the page rewires itself.
 */
export const SCHEDULING = {
  provider: "none",
  calcom: { username: "yogeshjirel" },
  calendly: { username: "yogeshjirel" },
};

export const MEETING_TYPES = [
  {
    id: "intro",
    name: "Intro call",
    minutes: 30,
    slug: "30min",
    summary:
      "A quick, no-pressure chat about the role, the product or the problem you are trying to solve.",
  },
  {
    id: "scoping",
    name: "Project scoping",
    minutes: 45,
    slug: "45min",
    summary:
      "Walk through requirements, constraints and timelines so I can come back with a realistic plan.",
  },
  {
    id: "deep-dive",
    name: "Technical deep dive",
    minutes: 60,
    slug: "60min",
    summary:
      "Architecture, database design, reporting pipelines or an AI/RAG integration — screen-share welcome.",
  },
];

/** Working hours advertised on the meeting page, in SITE.timezone. */
export const AVAILABILITY = [
  { day: "Sunday – Thursday", slots: "09:00 – 18:00" },
  { day: "Friday", slots: "09:00 – 14:00" },
  { day: "Saturday", slots: "Closed" },
];
