import type { UILanguage } from "@/lib/api";

const localeByLanguage: Record<UILanguage, string> = {
  "zh-CN": "zh-CN",
  en: "en-US",
};

const utcDateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const calendarDateFormatters = new Map<string, Intl.DateTimeFormat>();

function resolveLocale(language: UILanguage) {
  return localeByLanguage[language] ?? localeByLanguage["zh-CN"];
}

function getUtcDateTimeFormatter(language: UILanguage) {
  const locale = resolveLocale(language);
  let formatter = utcDateTimeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
    utcDateTimeFormatters.set(locale, formatter);
  }
  return formatter;
}

function getCalendarDateFormatter(language: UILanguage) {
  const locale = resolveLocale(language);
  let formatter = calendarDateFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
    });
    calendarDateFormatters.set(locale, formatter);
  }
  return formatter;
}

export function formatUtcTimestamp(value: string, language: UILanguage = "en") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${getUtcDateTimeFormatter(language).format(parsed)} UTC`;
}

export function formatCalendarDate(value: Date, language: UILanguage) {
  return getCalendarDateFormatter(language).format(value);
}

export function getSafeHttpUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
