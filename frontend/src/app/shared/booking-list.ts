import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Booking } from '../core/models';
import { DEFAULT_ZONE, dayOf, formatDay, timeOf } from '../core/time';

interface DayGroup {
  day: string;
  label: string;
  bookings: Booking[];
}

/** Liste de réservations groupées par jour, partagée entre « Mes réservations » et le planning admin. */
@Component({
  selector: 'app-booking-list',
  imports: [RouterLink],
  template: `
    @for (group of groups(); track group.day) {
      <section class="day">
        <h3 class="day-title">{{ group.label }}</h3>
        <ul class="list">
          @for (booking of group.bookings; track booking.id) {
            <li class="item" [class.cancelled]="booking.status === 'CANCELLED'">
              <span class="time mono"
                >{{ time(booking.startsAt) }}<span aria-hidden="true">–</span
                ><span class="sr-only"> à </span>{{ time(booking.endsAt) }}</span
              >
              <div class="body">
                <strong>{{ booking.title }}</strong>
                <span class="sub">
                  <a
                    [routerLink]="['/salles', booking.roomId]"
                    [queryParams]="{ jour: group.day }"
                    >{{ booking.roomName }}</a
                  >
                  · {{ booking.attendees }} pers.
                  @if (showOrganizer()) {
                    · {{ booking.organizer.fullName }}
                  }
                </span>
              </div>
              <div class="end">
                @if (booking.status === 'CANCELLED') {
                  <span class="tag muted">Annulée</span>
                } @else if (booking.cancellable) {
                  <button
                    type="button"
                    class="btn danger small"
                    [disabled]="busyId() === booking.id"
                    (click)="cancel.emit(booking)"
                  >
                    {{ busyId() === booking.id ? 'Annulation…' : 'Annuler' }}
                  </button>
                } @else {
                  <span class="tag ok">Confirmée</span>
                }
              </div>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 24px;
    }
    .day-title {
      font-size: 1rem;
      margin-bottom: 8px;
      color: var(--ink-2);
      font-family: var(--font-body);
      font-weight: 600;
      letter-spacing: 0;
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .item {
      display: grid;
      grid-template-columns: 116px minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 14px 16px;
      & + & {
        border-top: 1px solid var(--line);
      }
      &.cancelled {
        color: var(--ink-3);
        strong {
          text-decoration: line-through;
        }
      }
    }
    .time {
      font-size: 0.9375rem;
    }
    .body {
      display: grid;
      gap: 2px;
      min-width: 0;
      strong {
        overflow-wrap: anywhere;
      }
    }
    .sub {
      font-size: 0.875rem;
      color: var(--ink-3);
      a {
        color: var(--ink-2);
      }
    }
    @media (max-width: 600px) {
      .item {
        grid-template-columns: 1fr auto;
        gap: 4px 12px;
      }
      .time {
        grid-column: 1 / -1;
        color: var(--accent-hover);
      }
    }
  `,
})
export class BookingList {
  readonly bookings = input.required<Booking[]>();
  readonly zone = input(DEFAULT_ZONE);
  readonly showOrganizer = input(false);
  readonly busyId = input<number | null>(null);
  readonly cancel = output<Booking>();

  protected readonly groups = computed<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    for (const booking of this.bookings()) {
      const day = dayOf(booking.startsAt, this.zone());
      let group = groups.find((candidate) => candidate.day === day);
      if (!group) {
        group = { day, label: formatDay(day), bookings: [] };
        groups.push(group);
      }
      group.bookings.push(booking);
    }
    return groups;
  });

  protected time(iso: string): string {
    return timeOf(iso, this.zone());
  }
}
