/**
 * i18n.ts — Bilingual copy (English / Spanish) and language resolution.
 *
 * Unix philosophy: this module owns *all* user-facing text and the rules for
 * picking a language. Views receive a fully-resolved `Copy` object and never
 * branch on language themselves — they just render strings. Adding a language
 * means adding one `Copy` entry here; no view changes.
 */

export type Lang = "en" | "es";
export const LANGS: readonly Lang[] = ["en", "es"];
const DEFAULT_LANG: Lang = "en";

/** A titled card with an icon (services, steps, jail resources). */
export interface Trio {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
}
/** A question/answer pair for the FAQ. */
export interface QA {
  readonly q: string;
  readonly a: string;
}
/** An outbound resource link (jail / courts). */
export interface ResourceLink extends Trio {
  readonly href: string;
  readonly cta: string;
}

/** The complete set of strings for one language. */
export interface Copy {
  readonly htmlLang: Lang;
  /** Label of the *other* language, shown on the toggle button. */
  readonly switchLabel: string;
  readonly switchTo: Lang;
  readonly nav: {
    readonly home: string;
    readonly how: string;
    readonly calc: string;
    readonly jail: string;
    readonly contact: string;
    /** Short line under the brand name in the header. */
    readonly tagline: string;
    /** Small caption above the phone number in the header. */
    readonly callLabel: string;
    /** Visible text and accessible labels for the hamburger button. */
    readonly menu: string;
    readonly openMenu: string;
    readonly closeMenu: string;
  };
  readonly callbar: string;
  readonly cta: { readonly callPrefix: string; readonly request: string };
  readonly meta: { readonly description: string };
  readonly home: {
    readonly kicker: string;
    readonly title: string;
    readonly titleHl: string;
    readonly sub: string;
    readonly trust: string;
    readonly servicesHead: string;
    readonly services: readonly Trio[];
    readonly stepsHead: string;
    readonly steps: readonly Trio[];
    readonly reviewsHead: string;
    readonly findHead: string;
    readonly nearby: string;
    readonly trustedTmpl: string;
    readonly mapCta: string;
  };
  readonly how: {
    readonly title: string;
    readonly intro: string;
    readonly processHead: string;
    readonly processBody: string;
    readonly faqHead: string;
    readonly faqs: readonly QA[];
  };
  readonly calc: {
    readonly title: string;
    readonly intro: string;
    readonly label: string;
    readonly button: string;
    readonly resultTmpl: string;
    readonly fineprint: string;
    readonly yourEstimate: string;
    readonly forAmountTmpl: string;
    readonly premiumNote: string;
  };
  readonly contact: {
    readonly title: string;
    readonly introPre: string;
    readonly introPost: string;
    readonly name: string;
    readonly phone: string;
    readonly email: string;
    readonly defendant: string;
    readonly facility: string;
    readonly messageLabel: string;
    readonly submit: string;
    readonly consent: string;
    readonly errExpired: string;
    readonly errTooMany: string;
  };
  readonly thankyou: {
    readonly titleTmpl: string;
    readonly subTmpl: string;
    readonly dontWait: string;
  };
  readonly jail: {
    readonly title: string;
    readonly intro: string;
    readonly resourcesHead: string;
    readonly resources: readonly ResourceLink[];
    readonly bringHead: string;
    readonly bring: readonly string[];
    readonly disclaimer: string;
  };
  readonly footer: {
    readonly availHead: string;
    readonly serveHead: string;
    readonly familyLine: string;
    readonly legalTmpl: string;
  };
  readonly notFound: { readonly title: string; readonly body: string; readonly back: string };
}

/** Fill `{key}` placeholders in a template. Pure string substitution. */
export function fill(tmpl: string, vars: Record<string, string | number>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

import { COUNTY_JAIL, COURT_RESOURCES } from "./config.ts";

const EN: Copy = {
  htmlLang: "en",
  switchLabel: "Español",
  switchTo: "es",
  nav: {
    home: "Home",
    how: "How Bail Works",
    calc: "Bail Calculator",
    jail: "Find an Inmate",
    contact: "Get Help Now",
    tagline: "24/7 Bail Bonds · Oklahoma City",
    callLabel: "Call 24/7",
    menu: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  callbar: "Arrested? We answer 24/7 —",
  cta: { callPrefix: "Call Now:", request: "Request a Bondsman" },
  meta: {
    description:
      "24/7 bail bonds in Oklahoma City. Fast, affordable, family-owned. Se habla español. Call now.",
  },
  home: {
    kicker: "Oklahoma City · Available 24/7 · Family-Owned",
    title: "Get Your Loved One",
    titleHl: "Home Tonight",
    sub:
      "Get Home Fast. Family-Owned. Available 24/7. Serving the Oklahoma County Detention Center and the entire OKC metro with fast, affordable, judgment-free bail bonds.",
    trust: "★★★★★ Rated 5 stars · BBB-listed · Licensed Oklahoma bondsman",
    servicesHead: "How We Help Oklahoma Families",
    services: [
      {
        icon: "🏛️",
        title: "Felony &amp; Misdemeanor Bonds",
        body: "Any charge, any amount — we post bonds across the OKC metro.",
      },
      {
        icon: "⏱️",
        title: "Fast Release",
        body: "We start your paperwork the moment you call to get your loved one home.",
      },
      {
        icon: "💵",
        title: "Flexible Payment Plans",
        body: "Affordable options and financing so cost never keeps family apart.",
      },
      {
        icon: "🔒",
        title: "Confidential &amp; Respectful",
        body: "Your situation stays private. We treat every client with dignity.",
      },
    ],
    stepsHead: "Out in 4 Simple Steps",
    steps: [
      {
        icon: "1",
        title: "Call Us",
        body: "Phone us any hour. We gather the defendant's name and the jail.",
      },
      {
        icon: "2",
        title: "We Quote You",
        body: "You pay a small percentage of the bail — clear, up front, no surprises.",
      },
      {
        icon: "3",
        title: "We Post Bond",
        body: "Our licensed bondsman heads to the jail and posts the bond.",
      },
      {
        icon: "4",
        title: "Go Home",
        body: "Your loved one is released so they can prepare for court with family.",
      },
    ],
    reviewsHead: "What Your Neighbors Say",
    findHead: "Find Us &amp; Call Anytime",
    nearby: "Minutes from the Oklahoma County Detention Center.",
    trustedTmpl: "Trusted by <strong>{n}</strong> visitors and counting.",
    mapCta: "Open in Google Maps",
  },
  how: {
    title: "How Bail Bonds Work in Oklahoma",
    intro: "A clear, honest walkthrough for Oklahoma City families — no legal jargon.",
    processHead: "The Bail Process, Step by Step",
    processBody:
      "When someone is arrested in Oklahoma City they are booked into jail — usually the Oklahoma County Detention Center. A judge sets the bail amount based on the charge, the person's history, and flight risk. You can pay the full cash bond yourself, or pay a licensed bondsman a small percentage to post the bond for you. Working with a bondsman means you pay far less out of pocket to get your loved one home today.",
    faqHead: "Frequently Asked Questions",
    faqs: [
      {
        q: "How much does a bail bond cost in Oklahoma?",
        a: "Oklahoma bondsmen typically charge a non-refundable premium of about 10% of the total bail amount. On a $10,000 bond that's roughly $1,000. We offer payment plans to make it manageable.",
      },
      {
        q: "How long does release take?",
        a: "Once the bond is posted, the Oklahoma County Detention Center usually takes 4–12 hours to process a release depending on volume. Smaller county jails are often faster.",
      },
      {
        q: "What do you need from me?",
        a: "The defendant's full name and date of birth, the jail or county where they're held, and the bail amount if it's been set. We handle the rest.",
      },
      {
        q: "Do you offer payment plans?",
        a: "Yes. We work with families on flexible, affordable financing so cost never keeps someone in jail longer than necessary.",
      },
      {
        q: "What is collateral?",
        a: "For larger bonds we may ask for collateral (such as property) to secure the bond. It is returned when the case concludes and all court dates are met.",
      },
    ],
  },
  calc: {
    title: "Free Bail Cost Estimate",
    intro:
      "See roughly what you'll pay to get your loved one out. Based on Oklahoma's standard {rate}% premium.",
    label: "Total bail amount set by the court",
    button: "Estimate My Cost",
    resultTmpl: "Estimated cost to a bondsman: {amt} (our {rate}% premium).",
    fineprint:
      "Estimate only. Final premium and any payment plan are confirmed by a licensed bondsman. Premiums are non-refundable.",
    yourEstimate: "Your Estimate",
    forAmountTmpl:
      "For a bail amount of <strong>{bail}</strong>, your estimated cost to a bondsman is:",
    premiumNote: "That's our standard {rate}% premium. Ask about payment plans.",
  },
  contact: {
    title: "Get Help Now",
    introPre: "Fill this out and we'll call you back fast — or just call ",
    introPost: " right now, 24/7.",
    name: "Your name",
    phone: "Your phone",
    email: "Your email (optional)",
    defendant: "Defendant's name",
    facility: "Jail / county (if known)",
    messageLabel: "Anything we should know? (charge, bail amount, etc.)",
    submit: "Send — We'll Call You Back",
    consent:
      "Your information is kept confidential. By submitting you consent to be contacted about bail services.",
    errExpired: "Your session expired. Please try again.",
    errTooMany: "Too many requests. Please call us directly.",
  },
  thankyou: {
    titleTmpl: "We've Got It, {name} 🙏",
    subTmpl: "A bondsman will call <strong>{phone}</strong> shortly. Need help this minute?",
    dontWait: "Don't wait by the phone — call us directly, any hour:",
  },
  jail: {
    title: "Find an Inmate &amp; Jail Information",
    intro:
      "Locate someone in custody and get the details you need to act fast across the Oklahoma City metro.",
    resourcesHead: "Official Search &amp; Court Tools",
    resources: [
      {
        icon: "🔎",
        title: "Oklahoma County Jail Roster",
        body:
          `Search who is currently in custody at the ${COUNTY_JAIL.name}. Main line: ${COUNTY_JAIL.phone}.`,
        href: COUNTY_JAIL.inmateSearchUrl,
        cta: "Search the Jail Roster",
      },
      {
        icon: "📅",
        title: "Court Dates &amp; Case Lookup",
        body: "Look up Oklahoma court dockets, charges, and upcoming hearing dates on OSCN.",
        href: COURT_RESOURCES.oscnUrl,
        cta: "Search Court Records",
      },
      {
        icon: "🏢",
        title: "State Offender Search",
        body: "Search Oklahoma Department of Corrections records for state offenders.",
        href: COURT_RESOURCES.docUrl,
        cta: "Search ODOC Records",
      },
    ],
    bringHead: "What to Have Ready When You Call Us",
    bring: [
      "The defendant's full name and date of birth",
      "The jail or county where they are being held",
      "The booking number, if you have it",
      "The bail amount, if it has been set",
      "A valid photo ID for the person signing the bond",
    ],
    disclaimer:
      "Searches link to official third-party sites. We are not affiliated with the county jail or the courts — but we will help you make sense of it. Call us any time.",
  },
  footer: {
    availHead: "Available 24 Hours",
    serveHead: "We Serve",
    familyLine: "Family-owned · Licensed Oklahoma bondsman · Se habla español",
    legalTmpl:
      "© {year} {name}. All rights reserved. This site is a demonstration and not legal advice.",
  },
  notFound: { title: "Not Found", body: "That page doesn't exist.", back: "Back to safety" },
};

const ES: Copy = {
  htmlLang: "es",
  switchLabel: "English",
  switchTo: "en",
  nav: {
    home: "Inicio",
    how: "Cómo Funciona",
    calc: "Calculadora",
    jail: "Buscar un Detenido",
    contact: "Ayuda Ahora",
    tagline: "Fianzas 24/7 · Oklahoma City",
    callLabel: "Llame 24/7",
    menu: "Menú",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
  },
  callbar: "¿Arrestado? Contestamos las 24 horas —",
  cta: { callPrefix: "Llame ahora:", request: "Solicitar un Fiador" },
  meta: {
    description:
      "Fianzas las 24 horas en Oklahoma City. Rápido, accesible y familiar. Se habla español. Llame ahora.",
  },
  home: {
    kicker: "Oklahoma City · Disponible 24/7 · Negocio Familiar",
    title: "Saque a su Ser Querido",
    titleHl: "Hoy Mismo",
    sub:
      "Regrese a casa rápido. Negocio familiar. Disponible las 24 horas. Servimos al Centro de Detención del Condado de Oklahoma y a toda el área metropolitana de OKC con fianzas rápidas, accesibles y sin prejuicios.",
    trust: "★★★★★ Calificación 5 estrellas · Registrado en BBB · Fiador con licencia de Oklahoma",
    servicesHead: "Cómo Ayudamos a las Familias de Oklahoma",
    services: [
      {
        icon: "🏛️",
        title: "Fianzas por Delitos Graves y Menores",
        body: "Cualquier cargo, cualquier monto — tramitamos fianzas en toda el área de OKC.",
      },
      {
        icon: "⏱️",
        title: "Liberación Rápida",
        body: "Comenzamos su trámite en cuanto llama para llevar a su ser querido a casa.",
      },
      {
        icon: "💵",
        title: "Planes de Pago Flexibles",
        body: "Opciones accesibles y financiamiento para que el costo nunca separe a la familia.",
      },
      {
        icon: "🔒",
        title: "Confidencial y Respetuoso",
        body: "Su situación es privada. Tratamos a cada cliente con dignidad.",
      },
    ],
    stepsHead: "Libre en 4 Sencillos Pasos",
    steps: [
      {
        icon: "1",
        title: "Llámenos",
        body: "Llame a cualquier hora. Tomamos el nombre del detenido y la cárcel.",
      },
      {
        icon: "2",
        title: "Le Cotizamos",
        body: "Paga un pequeño porcentaje de la fianza — claro, por adelantado, sin sorpresas.",
      },
      {
        icon: "3",
        title: "Pagamos la Fianza",
        body: "Nuestro fiador con licencia va a la cárcel y deposita la fianza.",
      },
      {
        icon: "4",
        title: "A Casa",
        body: "Su ser querido queda libre para preparar su caso junto a la familia.",
      },
    ],
    reviewsHead: "Lo Que Dicen Sus Vecinos",
    findHead: "Encuéntrenos y Llame a Cualquier Hora",
    nearby: "A minutos del Centro de Detención del Condado de Oklahoma.",
    trustedTmpl: "La confianza de <strong>{n}</strong> visitantes y contando.",
    mapCta: "Abrir en Google Maps",
  },
  how: {
    title: "Cómo Funcionan las Fianzas en Oklahoma",
    intro: "Una explicación clara y honesta para las familias de Oklahoma City — sin tecnicismos.",
    processHead: "El Proceso de Fianza, Paso a Paso",
    processBody:
      "Cuando alguien es arrestado en Oklahoma City es ingresado a la cárcel — normalmente el Centro de Detención del Condado de Oklahoma. Un juez fija el monto de la fianza según el cargo, los antecedentes y el riesgo de fuga. Puede pagar la fianza completa en efectivo usted mismo, o pagar a un fiador con licencia un pequeño porcentaje para que deposite la fianza por usted. Trabajar con un fiador significa que paga mucho menos de su bolsillo para llevar a su ser querido a casa hoy.",
    faqHead: "Preguntas Frecuentes",
    faqs: [
      {
        q: "¿Cuánto cuesta una fianza en Oklahoma?",
        a: "Los fiadores de Oklahoma normalmente cobran una prima no reembolsable de cerca del 10% del monto total de la fianza. En una fianza de $10,000 eso es aproximadamente $1,000. Ofrecemos planes de pago para hacerlo manejable.",
      },
      {
        q: "¿Cuánto tarda la liberación?",
        a: "Una vez depositada la fianza, el Centro de Detención del Condado de Oklahoma suele tardar de 4 a 12 horas en procesar la liberación según el volumen. Las cárceles de condados más pequeños suelen ser más rápidas.",
      },
      {
        q: "¿Qué necesitan de mí?",
        a: "El nombre completo y la fecha de nacimiento del detenido, la cárcel o el condado donde está, y el monto de la fianza si ya fue fijado. Nosotros nos encargamos del resto.",
      },
      {
        q: "¿Ofrecen planes de pago?",
        a: "Sí. Trabajamos con las familias con financiamiento flexible y accesible para que el costo no mantenga a nadie en la cárcel más de lo necesario.",
      },
      {
        q: "¿Qué es una garantía (colateral)?",
        a: "Para fianzas más grandes podemos pedir una garantía (como una propiedad) para asegurar la fianza. Se devuelve cuando concluye el caso y se cumplen todas las fechas de corte.",
      },
    ],
  },
  calc: {
    title: "Estimado de Costo de Fianza Gratis",
    intro:
      "Vea aproximadamente cuánto pagará para sacar a su ser querido. Basado en la prima estándar del {rate}% de Oklahoma.",
    label: "Monto total de la fianza fijado por la corte",
    button: "Calcular Mi Costo",
    resultTmpl: "Costo estimado al fiador: {amt} (nuestra prima del {rate}%).",
    fineprint:
      "Solo un estimado. La prima final y cualquier plan de pago los confirma un fiador con licencia. Las primas no son reembolsables.",
    yourEstimate: "Su Estimado",
    forAmountTmpl: "Para una fianza de <strong>{bail}</strong>, su costo estimado al fiador es:",
    premiumNote: "Esa es nuestra prima estándar del {rate}%. Pregunte por los planes de pago.",
  },
  contact: {
    title: "Ayuda Ahora",
    introPre: "Complete esto y le devolvemos la llamada rápido — o simplemente llame al ",
    introPost: " ahora mismo, las 24 horas.",
    name: "Su nombre",
    phone: "Su teléfono",
    email: "Su correo (opcional)",
    defendant: "Nombre del detenido",
    facility: "Cárcel / condado (si lo sabe)",
    messageLabel: "¿Algo que debamos saber? (cargo, monto de fianza, etc.)",
    submit: "Enviar — Le Devolvemos la Llamada",
    consent:
      "Su información se mantiene confidencial. Al enviar, usted consiente ser contactado sobre servicios de fianza.",
    errExpired: "Su sesión expiró. Por favor intente de nuevo.",
    errTooMany: "Demasiadas solicitudes. Por favor llámenos directamente.",
  },
  thankyou: {
    titleTmpl: "Recibido, {name} 🙏",
    subTmpl: "Un fiador llamará al <strong>{phone}</strong> en breve. ¿Necesita ayuda ahora mismo?",
    dontWait: "No espere junto al teléfono — llámenos directamente, a cualquier hora:",
  },
  jail: {
    title: "Buscar un Detenido e Información de la Cárcel",
    intro:
      "Localice a alguien bajo custodia y obtenga los datos que necesita para actuar rápido en el área de Oklahoma City.",
    resourcesHead: "Búsqueda Oficial y Herramientas de la Corte",
    resources: [
      {
        icon: "🔎",
        title: "Lista de Detenidos del Condado de Oklahoma",
        body:
          `Busque quién está bajo custodia en el ${COUNTY_JAIL.name}. Línea principal: ${COUNTY_JAIL.phone}.`,
        href: COUNTY_JAIL.inmateSearchUrl,
        cta: "Buscar en la Lista",
      },
      {
        icon: "📅",
        title: "Fechas de Corte y Casos",
        body:
          "Consulte expedientes, cargos y próximas audiencias de las cortes de Oklahoma en OSCN.",
        href: COURT_RESOURCES.oscnUrl,
        cta: "Buscar en la Corte",
      },
      {
        icon: "🏢",
        title: "Búsqueda Estatal de Ofensores",
        body: "Busque registros del Departamento Correccional de Oklahoma.",
        href: COURT_RESOURCES.docUrl,
        cta: "Buscar en ODOC",
      },
    ],
    bringHead: "Qué Tener Listo Cuando Nos Llame",
    bring: [
      "El nombre completo y la fecha de nacimiento del detenido",
      "La cárcel o el condado donde está detenido",
      "El número de registro (booking), si lo tiene",
      "El monto de la fianza, si ya fue fijado",
      "Una identificación con foto válida de quien firma la fianza",
    ],
    disclaimer:
      "Las búsquedas enlazan a sitios oficiales de terceros. No estamos afiliados a la cárcel del condado ni a las cortes — pero le ayudaremos a entenderlo todo. Llámenos a cualquier hora.",
  },
  footer: {
    availHead: "Disponible las 24 Horas",
    serveHead: "Servimos",
    familyLine: "Negocio familiar · Fiador con licencia de Oklahoma · Se habla español",
    legalTmpl:
      "© {year} {name}. Todos los derechos reservados. Este sitio es una demostración y no es asesoría legal.",
  },
  notFound: {
    title: "No Encontrado",
    body: "Esa página no existe.",
    back: "Volver a un lugar seguro",
  },
};

const COPY: Record<Lang, Copy> = { en: EN, es: ES };

/** Get the copy bundle for a language. */
export function copyFor(lang: Lang): Copy {
  return COPY[lang];
}

/** The other language (for the toggle). */
export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "es" : "en";
}

function parseAcceptLanguage(header: string | null): Lang | null {
  if (!header) return null;
  // Spanish if it appears before any English tag; cheap and good enough.
  const lower = header.toLowerCase();
  const es = lower.indexOf("es");
  const en = lower.indexOf("en");
  if (es === -1) return null;
  if (en === -1 || es < en) return "es";
  return null;
}

function langCookieValue(cookie: string | null): Lang | null {
  const m = cookie?.match(/(?:^|;\s*)lang=(en|es)/);
  return (m?.[1] as Lang) ?? null;
}

/**
 * Resolve the active language with clear precedence:
 *   ?lang= query  →  saved cookie  →  Accept-Language  →  default (en).
 * The query wins so the visible toggle is always authoritative.
 */
export function resolveLang(req: Request, url: URL): Lang {
  const q = url.searchParams.get("lang");
  if (q === "en" || q === "es") return q;
  return langCookieValue(req.headers.get("cookie")) ??
    parseAcceptLanguage(req.headers.get("accept-language")) ??
    DEFAULT_LANG;
}

/** Build the Set-Cookie value persisting the chosen language for a year. */
export function langCookie(lang: Lang): string {
  return `lang=${lang}; Path=/; SameSite=Lax; Max-Age=31536000`;
}
