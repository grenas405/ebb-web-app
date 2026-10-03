/* app.js — Progressive enhancement only. The site is fully functional without
   it (server renders everything). First-party, no inline script, CSP-safe.

   The calculator's result string is localized server-side and handed to us via
   the output element's data-template attribute (with an {amt} placeholder), so
   this script stays language-agnostic. */

"use strict";

// Loaded from <head> (blocking, tiny, cached) so this class is set before first
// paint: CSS collapses the mobile menu only when JS is present, so without JS
// the nav simply renders expanded and stays usable.
document.documentElement.classList.add("js");

/** Oklahoma standard bail premium. Mirrors BUSINESS.premiumRate on the server. */
const PREMIUM_RATE = 0.10;

const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Enhance the calculator: live estimate without a round-trip. */
function enhanceCalculator() {
  const form = document.getElementById("calc-form");
  if (!form) return;
  const input = form.querySelector("#bail");
  const out = form.querySelector("#calc-result");
  const template = out.getAttribute("data-template") || "{amt}";

  const compute = () => {
    const bail = Number(String(input.value).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(bail) || bail <= 0) {
      out.textContent = "";
      return;
    }
    const premium = Math.round(bail * PREMIUM_RATE * 100) / 100;
    out.textContent = template.replace("{amt}", usd(premium));
  };

  input.addEventListener("input", compute);
  // Intercept submit so users with JS stay on-page; no-JS falls back to POST.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    compute();
    out.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/** Hamburger menu: toggle, close on Escape / outside click / link tap / desktop resize. */
function enhanceNav() {
  const header = document.querySelector(".site-header");
  const toggle = header && header.querySelector(".nav-toggle");
  const menu = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
  if (!menu) return;
  const desktop = globalThis.matchMedia("(min-width: 1280px)");

  const setOpen = (open, { focusToggle = false } = {}) => {
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      toggle.getAttribute(open ? "data-label-close" : "data-label-open"),
    );
    if (!open && focusToggle) toggle.focus();
  };
  const isOpen = () => header.classList.contains("is-open");

  toggle.addEventListener("click", () => setOpen(!isOpen()));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) setOpen(false, { focusToggle: true });
  });
  document.addEventListener("click", (e) => {
    if (isOpen() && !header.contains(e.target)) setOpen(false);
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  desktop.addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });

  // Elevate the header once the page scrolls under it.
  const onScroll = () => header.classList.toggle("is-scrolled", globalThis.scrollY > 8);
  globalThis.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

document.addEventListener("DOMContentLoaded", () => {
  enhanceNav();
  enhanceCalculator();
});
