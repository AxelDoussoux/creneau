import { addDays, dayOf, nextOpenDay, timeOf, weekdayOf, zonedToIso } from './time';

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

describe('time helpers (Europe/Paris)', () => {
  it('converts Paris wall-clock time to UTC in winter and summer', () => {
    expect(zonedToIso('2030-01-07', '10:00')).toBe('2030-01-07T09:00:00.000Z');
    expect(zonedToIso('2030-07-08', '10:00')).toBe('2030-07-08T08:00:00.000Z');
  });

  it('handles the day of the daylight saving switch', () => {
    // Le 31 mars 2030, Paris passe de UTC+1 à UTC+2 à 2 h du matin.
    expect(zonedToIso('2030-03-31', '12:00')).toBe('2030-03-31T10:00:00.000Z');
  });

  it('reads back the Paris day and time of an instant', () => {
    expect(dayOf('2030-01-07T23:30:00Z')).toBe('2030-01-08');
    expect(timeOf('2030-01-07T23:30:00Z')).toBe('00:30');
  });

  it('skips weekends when looking for the next open day', () => {
    expect(weekdayOf('2030-01-12')).toBe('SATURDAY');
    expect(nextOpenDay('2030-01-12', WEEKDAYS)).toBe('2030-01-14');
    expect(addDays('2030-12-31', 1)).toBe('2031-01-01');
  });
});
