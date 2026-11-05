/**
 * Les salles vivent à l'heure de Paris, quel que soit le fuseau du navigateur.
 * Ces helpers convertissent entre « jour + heure à Paris » et instants ISO, sans dépendance externe.
 */

export const DEFAULT_ZONE = 'Europe/Paris';

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function zonedParts(date: Date, zone: string): Record<string, number> {
  let formatter = partsFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    partsFormatters.set(zone, formatter);
  }
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts;
}

function offsetMs(date: Date, zone: string): number {
  const p = zonedParts(date, zone);
  const asUtc = Date.UTC(p['year'], p['month'] - 1, p['day'], p['hour'], p['minute'], p['second']);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** « 2030-01-07 » + « 10:30 » à Paris → instant. */
export function zonedToDate(day: string, time: string, zone = DEFAULT_ZONE): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wallClock = Date.UTC(y, m - 1, d, hh, mm);
  let instant = wallClock - offsetMs(new Date(wallClock), zone);
  instant = wallClock - offsetMs(new Date(instant), zone);
  return new Date(instant);
}

export function zonedToIso(day: string, time: string, zone = DEFAULT_ZONE): string {
  return zonedToDate(day, time, zone).toISOString();
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dayOf(iso: string | Date, zone = DEFAULT_ZONE): string {
  const p = zonedParts(new Date(iso), zone);
  return `${p['year']}-${pad(p['month'])}-${pad(p['day'])}`;
}

export function timeOf(iso: string | Date, zone = DEFAULT_ZONE): string {
  const p = zonedParts(new Date(iso), zone);
  return `${pad(p['hour'])}:${pad(p['minute'])}`;
}

export function minutesOf(iso: string | Date, zone = DEFAULT_ZONE): number {
  const p = zonedParts(new Date(iso), zone);
  return p['hour'] * 60 + p['minute'];
}

export function today(zone = DEFAULT_ZONE): string {
  return dayOf(new Date(), zone);
}

export function addDays(day: string, amount: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + amount));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function weekdayOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Prochain jour ouvert à partir de `day` inclus. */
export function nextOpenDay(day: string, openDays: string[]): string {
  let candidate = day;
  for (let i = 0; i < 7 && !openDays.includes(weekdayOf(candidate)); i++) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

export function toTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function toMinutes(time: string): number {
  const [hh, mm] = time.split(':').map(Number);
  return hh * 60 + mm;
}

const longDay = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const label = longDay.format(new Date(Date.UTC(y, m - 1, d, 12)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${pad(m)}`;
}
