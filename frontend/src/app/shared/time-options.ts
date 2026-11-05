import { BookingRules } from '../core/models';
import { addDays, dayOf, minutesOf, nextOpenDay, toTime } from '../core/time';

/** Heures proposées dans les listes déroulantes, alignées sur le pas des créneaux. */
export function timeOptions(rules: BookingRules, includeClosing: boolean): string[] {
  const options: string[] = [];
  const last = rules.closingHour * 60 - (includeClosing ? 0 : rules.slotMinutes);
  for (let minutes = rules.openingHour * 60; minutes <= last; minutes += rules.slotMinutes) {
    options.push(toTime(minutes));
  }
  return options;
}

/** Premier créneau d'une heure encore réservable : aujourd'hui si possible, sinon le prochain jour ouvert. */
export function suggestedSlot(rules: BookingRules): { day: string; start: string; end: string } {
  const now = new Date();
  const opening = rules.openingHour * 60;
  const closing = rules.closingHour * 60;
  let day = dayOf(now, rules.zone);
  let start = Math.ceil((minutesOf(now, rules.zone) + 1) / rules.slotMinutes) * rules.slotMinutes;

  const openToday = rules.openDays.length === 0 || nextOpenDay(day, rules.openDays) === day;
  if (!openToday || start + 60 > closing) {
    day = nextOpenDay(addDays(day, openToday ? 1 : 0), rules.openDays);
    start = opening;
  }
  start = Math.max(start, opening);
  return { day, start: toTime(start), end: toTime(Math.min(start + 60, closing)) };
}
