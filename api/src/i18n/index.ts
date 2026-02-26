import path from 'node:path';
import fs from 'node:fs';

const localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');

type Messages = Record<string, string>;
const locales: Record<string, Messages> = {};

function loadLocale(lang: string): Messages {
  if (locales[lang]) return locales[lang];
  const file = path.join(localesDir, `${lang}.json`);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(raw) as { errors?: Record<string, string> };
    const flat: Messages = {};
    if (data.errors) {
      for (const [k, v] of Object.entries(data.errors)) {
        flat[`errors.${k}`] = v;
      }
    }
    locales[lang] = flat;
    return flat;
  } catch {
    return {};
  }
}

const SUPPORTED = ['en', 'es'] as const;
const DEFAULT_LANG = 'es';

function headerValue(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Resolve language from request: X-Language header, then Accept-Language, then default.
 */
export function getLang(request?: { headers?: Record<string, string | string[] | undefined> }): string {
  const headers = request?.headers ?? {};
  const x = headerValue(headers['x-language'] ?? headers['X-Language']);
  if (x) {
    const first = x.split(',')[0].trim().toLowerCase().slice(0, 2);
    if (SUPPORTED.includes(first as (typeof SUPPORTED)[number])) return first;
  }
  const accept = headerValue(headers['accept-language'] ?? headers['Accept-Language']);
  if (accept) {
    const parts = accept.split(',').map((p) => p.split(';')[0].trim().toLowerCase().slice(0, 2));
    for (const p of parts) {
      if (SUPPORTED.includes(p as (typeof SUPPORTED)[number])) return p;
    }
  }
  return DEFAULT_LANG;
}

/**
 * Translate a key (e.g. "errors.tournamentNotFound") with optional params for {{param}} substitution.
 */
export function t(lang: string, key: string, params?: Record<string, string | number>): string {
  const messages = loadLocale(SUPPORTED.includes(lang as (typeof SUPPORTED)[number]) ? lang : DEFAULT_LANG);
  let msg = messages[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return msg;
}
