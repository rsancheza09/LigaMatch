/**
 * Date utilities that use the browser's local timezone (no UTC conversion for display/input).
 * Use these for date/datetime-local inputs and for comparing dates in the user's local day.
 */

/**
 * Returns YYYY-MM-DD for the given date in the browser's local timezone.
 * Use for <input type="date" value={...} />.
 */
export function toLocalDateString(d: Date | string | null | undefined): string {
  if (d == null || d === '') return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns YYYY-MM-DDTHH:mm for the given date in the browser's local timezone.
 * Use for <input type="datetime-local" value={...} />.
 */
export function toLocalDateTimeString(d: Date | string | null | undefined): string {
  if (d == null || d === '') return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/**
 * Parses a local date string (YYYY-MM-DD) and returns start/end of that day in the
 * browser's local timezone as Unix timestamps. Use to filter ISO timestamps by "date in local time".
 */
export function getLocalDayRange(dateStr: string): { startMs: number; endMs: number } | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const startMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const endMs = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return { startMs, endMs };
}

/**
 * Returns today's date in local timezone as YYYY-MM-DD (e.g. for default value of date inputs).
 */
export function getTodayLocalDateString(): string {
  return toLocalDateString(new Date());
}

/**
 * Formats a date string (YYYY-MM-DD or parseable) as MM/DD/YYYY for display (e.g. birth dates).
 * Returns empty string if input is invalid or empty.
 */
export function formatBirthDateMMDDYYYY(d: string | null | undefined): string {
  if (d == null || d === '') return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${day}/${y}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(month: number, year: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

/** Returns YYYY-MM-DD or null if invalid. Validates leap year and February. */
export function buildBirthDateFromParts(
  day: number | '',
  month: number | '',
  year: number | ''
): string | null {
  if (day === '' || month === '' || year === '') return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || y < 1900 || y > 2100) return null;
  const maxDay = getDaysInMonth(m, y);
  if (d < 1 || d > maxDay) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Parse YYYY-MM-DD into { day, month, year } or null. */
export function parseBirthDateParts(dateStr: string | null | undefined): { day: number; month: number; year: number } | null {
  if (dateStr == null || dateStr === '' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > getDaysInMonth(m, y)) return null;
  return { day: d, month: m, year: y };
}

/** True if birthDate (YYYY-MM-DD) is valid and the person is under 18 (minor). */
export function isPlayerMinor(birthDate: string | null | undefined): boolean {
  if (birthDate == null || birthDate === '' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  const age18 = new Date(birth.getFullYear() + 18, birth.getMonth(), birth.getDate());
  return age18 > today;
}

/** Display string for player birth (birthDate or birthYear fallback). Returns '—' when both empty. */
export function formatPlayerBirthDisplay(
  birthDate: string | null | undefined,
  birthYear?: number | null
): string {
  const fromDate = formatBirthDateMMDDYYYY(birthDate);
  if (fromDate) return fromDate;
  if (birthYear != null) return String(birthYear);
  return '—';
}

/**
 * Returns current age in years from birth date and/or birth year. Uses birthDate when available for exact age;
 * falls back to birthYear (current year - year) when only year is set. Returns null when neither is valid.
 */
export function getAgeFromBirthDate(
  birthDate: string | null | undefined,
  birthYear?: number | null
): number | null {
  if (birthDate != null && birthDate !== '' && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age >= 0 ? age : null;
  }
  if (birthYear != null && birthYear >= 1900 && birthYear <= 2100) {
    const age = new Date().getFullYear() - birthYear;
    return age >= 0 ? age : null;
  }
  return null;
}
