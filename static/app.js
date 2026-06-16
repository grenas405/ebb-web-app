/* app.js — Progressive enhancement only. The site is fully functional without
   it (server renders everything). First-party, no inline script, CSP-safe.

   The calculator's result string is localized server-side and handed to us via
   the output element's data-template attribute (with an {amt} placeholder), so
   this script stays language-agnostic. */

"use strict";

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

document.addEventListener("DOMContentLoaded", enhanceCalculator);
