/**
 * scheduler.js — the booking page.
 *
 * Two modes, chosen by SCHEDULING.provider in config.js:
 *
 *  1. A connected calendar (cal.com or Calendly) is embedded in an iframe and
 *     the meeting-type cards swap the embedded event type.
 *  2. With no provider connected ("none"), the built-in request form takes
 *     over: it validates a proposed slot, shows it in both the visitor's
 *     timezone and Kathmandu, opens a pre-filled email, and hands back a
 *     downloadable .ics invite so the slot lands in their calendar too.
 */

import { SITE, SCHEDULING, MEETING_TYPES, AVAILABILITY } from "../config.js";
import { qs, qsa, escapeHtml } from "../utils/dom.js";
import { observe } from "./reveal.js";

/* ------------------------------------------------------ embed helpers */

function embedUrl(type) {
  const { provider, calcom, calendly } = SCHEDULING;

  if (provider === "calcom") {
    return `https://cal.com/${calcom.username}/${type.slug}?embed=true&theme=dark`;
  }

  if (provider === "calendly") {
    return `https://calendly.com/${calendly.username}/${type.slug}?embed_domain=${location.hostname}&embed_type=Inline&background_color=161b22&text_color=c9d1d9&primary_color=2f81f7`;
  }

  return null;
}

/* -------------------------------------------------------- time helpers */

const pad = (value) => String(value).padStart(2, "0");

/** Format a Date in an arbitrary IANA timezone. */
function formatIn(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const visitorZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time";

/* --------------------------------------------------------- .ics output */

/** Escape a value for an iCalendar text property. */
const icsEscape = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

/** Fold a content line to the 75-octet limit required by RFC 5545. */
function fold(line) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

const toUtcStamp = (date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate(),
  )}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
    date.getUTCSeconds(),
  )}Z`;

function buildIcs({ start, end, title, description, guestName, guestEmail }) {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@yogeshjirel.com.np`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Yogesh Jirel//Portfolio Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "LOCATION:Online — video link shared on confirmation",
    `ORGANIZER;CN=${icsEscape(SITE.name)}:mailto:${SITE.email}`,
    `ATTENDEE;CN=${icsEscape(guestName)};RSVP=TRUE:mailto:${guestEmail}`,
    "STATUS:TENTATIVE",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(fold).join("\r\n");
}

function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------- availability */

function renderAvailability() {
  const mount = qs("#availabilityList");
  if (!mount) return;

  mount.innerHTML = AVAILABILITY.map(
    (entry) =>
      `<li><span class="day">${escapeHtml(entry.day)}</span>
           <span class="slot">${escapeHtml(entry.slots)}</span></li>`,
  ).join("");

  const zone = qs("#visitorZone");
  if (zone) zone.innerHTML = `<strong>${escapeHtml(visitorZone())}</strong>`;
}

/* ----------------------------------------------------- meeting types */

function renderMeetingTypes(onSelect) {
  const mount = qs("#meetingTypes");
  if (!mount) return;

  mount.innerHTML = MEETING_TYPES.map(
    (type, index) => `
      <button type="button" class="meet-type" data-type="${type.id}"
              aria-pressed="${index === 0}" data-reveal>
        <span class="duration">${type.minutes} MIN</span>
        <h3>${escapeHtml(type.name)}</h3>
        <p>${escapeHtml(type.summary)}</p>
      </button>`,
  ).join("");

  observe(mount);

  mount.addEventListener("click", (event) => {
    const button = event.target.closest(".meet-type");
    if (!button) return;

    qsa(".meet-type", mount).forEach((node) =>
      node.setAttribute("aria-pressed", String(node === button)),
    );

    const type = MEETING_TYPES.find((item) => item.id === button.dataset.type);
    if (type) onSelect(type);
  });
}

/* --------------------------------------------------------- the module */

export function initScheduler() {
  const page = qs("#meetingPage");
  if (!page) return;

  const embed = qs("#schedulerEmbed");
  const fallback = qs("#bookingFallback");
  const form = qs("#bookingForm");
  const status = qs("#bookingStatus");
  const preview = qs("#slotPreview");
  const typeSelect = qs("#meetingType");

  let selected = MEETING_TYPES[0];

  renderAvailability();

  if (typeSelect) {
    typeSelect.innerHTML = MEETING_TYPES.map(
      (type) =>
        `<option value="${type.id}">${escapeHtml(type.name)} — ${type.minutes} min</option>`,
    ).join("");
  }

  const syncType = (type) => {
    selected = type;
    if (typeSelect) typeSelect.value = type.id;
    if (embed && !embed.hidden) {
      const url = embedUrl(type);
      const frame = qs("iframe", embed);
      if (frame && url) frame.src = url;
    }
    updatePreview();
  };

  renderMeetingTypes(syncType);

  typeSelect?.addEventListener("change", () => {
    const type = MEETING_TYPES.find((item) => item.id === typeSelect.value);
    if (!type) return;
    selected = type;
    qsa(".meet-type").forEach((node) =>
      node.setAttribute("aria-pressed", String(node.dataset.type === type.id)),
    );
    updatePreview();
  });

  /* ---- connected calendar ---- */

  const url = embedUrl(selected);

  if (url && embed) {
    embed.hidden = false;
    if (fallback) fallback.hidden = true;
    embed.innerHTML = `<iframe src="${url}" title="Booking calendar for ${escapeHtml(
      SITE.name,
    )}" loading="lazy" allow="camera; microphone; fullscreen"></iframe>`;
    return;
  }

  /* ---- built-in request form ---- */

  if (embed) embed.hidden = true;
  if (fallback) fallback.hidden = false;
  if (!form) return;

  function readSlot() {
    const date = qs("#meetingDate", form)?.value;
    const time = qs("#meetingTime", form)?.value;
    if (!date || !time) return null;

    const start = new Date(`${date}T${time}`);
    if (Number.isNaN(start.getTime())) return null;

    const end = new Date(start.getTime() + selected.minutes * 60000);
    return { start, end };
  }

  function updatePreview() {
    if (!preview) return;

    const slot = readSlot();
    if (!slot) {
      preview.textContent =
        "Pick a date and time and I will show it in both timezones.";
      preview.className = "form-status";
      return;
    }

    const yours = formatIn(slot.start, visitorZone());
    const mine = formatIn(slot.start, SITE.timezone);
    const past = slot.start.getTime() < Date.now();

    preview.innerHTML = past
      ? "That slot is in the past — pick a future date."
      : `<strong>${escapeHtml(selected.name)}</strong> · ${selected.minutes} min<br>
         Your time: ${escapeHtml(yours)}<br>
         Kathmandu: ${escapeHtml(mine)}`;
    preview.className = `form-status ${past ? "form-status--err" : "form-status--ok"}`;
  }

  // Expose for syncType, which runs before this point on first render.
  window.requestAnimationFrame(updatePreview);

  qsa("#meetingDate, #meetingTime", form).forEach((input) =>
    input.addEventListener("change", updatePreview),
  );

  const dateInput = qs("#meetingDate", form);
  if (dateInput) {
    const today = new Date();
    dateInput.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
      today.getDate(),
    )}`;
  }

  function composeDetails() {
    const slot = readSlot();
    const name = qs("#guestName", form).value.trim();
    const email = qs("#guestEmail", form).value.trim();
    const company = qs("#guestCompany", form).value.trim();
    const notes = qs("#guestNotes", form).value.trim();

    const title = `${selected.name} — ${name || "Guest"} & ${SITE.name}`;
    const description = [
      `Meeting: ${selected.name} (${selected.minutes} minutes)`,
      `Requested by: ${name}${company ? ` (${company})` : ""}`,
      `Email: ${email}`,
      slot ? `Proposed start: ${formatIn(slot.start, visitorZone())}` : "",
      slot ? `Kathmandu time: ${formatIn(slot.start, SITE.timezone)}` : "",
      "",
      notes || "No additional notes.",
    ]
      .filter(Boolean)
      .join("\n");

    return { slot, name, email, title, description };
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const { slot, name, email, title, description } = composeDetails();

    if (!slot) {
      status.textContent = "Please choose a date and a time.";
      status.className = "form-status form-status--err";
      return;
    }

    if (slot.start.getTime() < Date.now()) {
      status.textContent = "That slot is in the past — pick a future date.";
      status.className = "form-status form-status--err";
      return;
    }

    const subject = `Meeting request: ${selected.name} (${selected.minutes} min)`;
    const mailto = `mailto:${SITE.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(description)}`;

    downloadIcs(
      `meeting-${selected.id}-${slot.start.toISOString().slice(0, 10)}.ics`,
      buildIcs({
        start: slot.start,
        end: slot.end,
        title,
        description,
        guestName: name,
        guestEmail: email,
      }),
    );

    status.innerHTML = `Invite downloaded. Your email app should be opening a request to
      <strong>${escapeHtml(SITE.email)}</strong> — send it and I will confirm within one working day.`;
    status.className = "form-status form-status--ok";

    window.location.href = mailto;
  });

  qs("#downloadIcs")?.addEventListener("click", () => {
    const { slot, name, email, title, description } = composeDetails();

    if (!slot) {
      status.textContent =
        "Choose a date and time before downloading the invite.";
      status.className = "form-status form-status--err";
      return;
    }

    downloadIcs(
      `meeting-${selected.id}-${slot.start.toISOString().slice(0, 10)}.ics`,
      buildIcs({
        start: slot.start,
        end: slot.end,
        title,
        description,
        guestName: name || "Guest",
        guestEmail: email || SITE.email,
      }),
    );

    status.textContent = "Calendar invite downloaded.";
    status.className = "form-status form-status--ok";
  });
}
