/**
 * Get ISO 4217 currency code for a locale (e.g. es-MX -> MXN, en-US -> USD).
 * Uses Intl when available, with fallback mapping for common locales.
 */
export function getCurrencyForLocale(locale: string): string {
  try {
    const opts = new Intl.NumberFormat(locale, { style: 'currency' }).resolvedOptions();
    const currency = (opts as { currency?: string }).currency;
    if (currency) return currency;
  } catch {
    /* ignore */
  }
  const parts = locale.split('-');
  const lang = parts[0]?.toLowerCase() ?? '';
  const region = parts[1]?.toUpperCase() ?? '';
  const map: Record<string, string> = {
    MX: 'MXN',
    ES: 'EUR',
    AR: 'ARS',
    CO: 'COP',
    CL: 'CLP',
    PE: 'PEN',
    US: 'USD',
    GB: 'GBP',
  };
  if (region && map[region]) return map[region];
  if (lang === 'es') return 'MXN';
  if (lang === 'en') return 'USD';
  return 'USD';
}

/**
 * Format amount with currency for display.
 */
export function formatCurrency(amount: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale ?? navigator.language, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
