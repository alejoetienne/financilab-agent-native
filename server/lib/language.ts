import type { Locale } from "./scam-shield.js";

/** `auto` resolves to the detected language of the case's message. */
export const LANG_OPTIONS = ["auto", "es", "en"] as const;
export type LangOption = (typeof LANG_OPTIONS)[number];

const ES_WORDS = new Set(
  "el la los las un una unos unas de del al y o que en su sus por para con sin es son está están ha han hemos le les se su tu usted ustedes nos mi mis este esta estos estas ese esa pero como más muy ya aquí cuenta tarjeta banco código mensaje gracias hola señor señora favor ingrese confirme responda envíe pago premio ganador días horas dinero datos clave bloqueada bloqueado".split(
    " ",
  ),
);
const EN_WORDS = new Set(
  "the a an of and or to in on at for with without is are was were be been has have had it its this that these those your you yours we our us my me i not but as more very please click confirm account card bank code message thanks hello dear payment prize winner days hours money details password blocked limited verify".split(
    " ",
  ),
);

/**
 * Heuristic Spanish-vs-English detection for a case message. Counts common
 * function words in each language plus Spanish-only characters (ñ, accents,
 * ¿ ¡). Ties and empty text fall back to Spanish, the app's primary audience.
 */
export function detectLanguage(text: string | null | undefined): Locale {
  const s = (text ?? "").toLowerCase();
  let es = (s.match(/[ñáéíóúü¿¡]/g) ?? []).length;
  let en = 0;
  // Ignore URLs and emails so domains don't skew the count.
  const words = s
    .replace(/\b(?:https?:\/\/|www\.)\S+/g, " ")
    .replace(/\S+@\S+/g, " ")
    .match(/[a-zñáéíóúü]+/g) ?? [];
  for (const w of words) {
    if (ES_WORDS.has(w)) es++;
    if (EN_WORDS.has(w)) en++;
  }
  return en > es ? "en" : "es";
}

/** Resolve an explicit `es`/`en` override, or detect from the message for `auto`. */
export function resolveLang(
  lang: LangOption | undefined,
  text: string | null | undefined,
): Locale {
  return lang === "es" || lang === "en" ? lang : detectLanguage(text);
}
