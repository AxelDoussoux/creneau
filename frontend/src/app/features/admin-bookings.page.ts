import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ApiService, toProblem } from '../core/api.service';
import { Booking, Problem } from '../core/models';
import { addDays, formatDay, today, weekdayOf } from '../core/time';
import { BookingList } from '../shared/booking-list';

/** Lundi de la semaine contenant `day`. */
function mondayOf(day: string): string {
  const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  return addDays(day, -order.indexOf(weekdayOf(day)));
}

@Component({
  selector: 'app-admin-bookings-page',
  imports: [BookingList],
  template: `
    <div class="container page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Administration</p>
          <h1>Planning global</h1>
        </div>
        <div class="week-nav">
          <button
            type="button"
            class="btn ghost small"
            (click)="shift(-7)"
            aria-label="Semaine précédente"
          >
            ←
          </button>
          <span class="mono">{{ weekLabel() }}</span>
          <button
            type="button"
            class="btn ghost small"
            (click)="shift(7)"
            aria-label="Semaine suivante"
          >
            →
          </button>
        </div>
      </header>

      @if (problem(); as p) {
        <p class="alert error" role="alert">{{ p.detail }}</p>
      }

      @if (bookings(); as list) {
        <dl class="stats">
          <div class="card">
            <dt>Réservations</dt>
            <dd class="mono">{{ stats().confirmed }}</dd>
          </div>
          <div class="card">
            <dt>Heures réservées</dt>
            <dd class="mono">{{ stats().hours }}</dd>
          </div>
          <div class="card">
            <dt>Annulations</dt>
            <dd class="mono">{{ stats().cancelled }}</dd>
          </div>
          <div class="card">
            <dt>Salle la plus demandée</dt>
            <dd>{{ stats().topRoom }}</dd>
          </div>
        </dl>
        @if (list.length === 0) {
          <div class="card empty"><strong>Aucune réservation cette semaine.</strong></div>
        } @else {
          <app-booking-list
            [bookings]="list"
            [zone]="api.rules().zone"
            [showOrganizer]="true"
            [busyId]="busyId()"
            (cancel)="cancel($event)"
          />
        }
      } @else {
        <div class="skeleton" style="height: 320px"></div>
      }
    </div>
  `,
  styles: `
    .week-nav {
      display: flex;
      align-items: center;
      gap: 12px;
      .mono {
        font-size: 0.875rem;
      }
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin: 0;
      > div {
        padding: 16px;
        display: grid;
        gap: 6px;
      }
      dt {
        font-size: 0.8125rem;
        color: var(--ink-3);
      }
      dd {
        margin: 0;
        font: 700 1.5rem/1.1 var(--font-display);
      }
      dd.mono {
        font-family: var(--font-mono);
        font-weight: 500;
      }
    }
    @media (max-width: 760px) {
      .stats {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class AdminBookingsPage {
  protected readonly api = inject(ApiService);
  protected readonly monday = signal(mondayOf(today()));
  protected readonly bookings = signal<Booking[] | null>(null);
  protected readonly problem = signal<Problem | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected readonly weekLabel = computed(
    () => `${formatDay(this.monday())} → ${formatDay(addDays(this.monday(), 4))}`,
  );

  protected readonly stats = computed(() => {
    const list = this.bookings() ?? [];
    const confirmed = list.filter((booking) => booking.status === 'CONFIRMED');
    const minutes = confirmed.reduce(
      (sum, b) => sum + (Date.parse(b.endsAt) - Date.parse(b.startsAt)) / 60000,
      0,
    );
    const perRoom = new Map<string, number>();
    for (const booking of confirmed)
      perRoom.set(booking.roomName, (perRoom.get(booking.roomName) ?? 0) + 1);
    const top = [...perRoom.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      confirmed: confirmed.length,
      cancelled: list.length - confirmed.length,
      hours: (Math.round((minutes / 60) * 10) / 10).toLocaleString('fr-FR'),
      topRoom: top ? top[0] : '—',
    };
  });

  constructor() {
    effect(() => {
      const monday = this.monday();
      untracked(() => this.load(monday));
    });
  }

  private load(monday: string): void {
    this.bookings.set(null);
    this.problem.set(null);
    this.api.adminBookings(monday, addDays(monday, 6)).subscribe({
      next: (list) => this.bookings.set(list),
      error: (error: unknown) => this.problem.set(toProblem(error)),
    });
  }

  protected shift(days: number): void {
    this.monday.set(addDays(this.monday(), days));
  }

  protected cancel(booking: Booking): void {
    if (!confirm(`Annuler « ${booking.title} » de ${booking.organizer.fullName} ?`)) return;
    this.busyId.set(booking.id);
    this.api.cancel(booking.id).subscribe({
      next: (updated) => {
        this.bookings.update(
          (list) => list?.map((item) => (item.id === updated.id ? updated : item)) ?? null,
        );
        this.busyId.set(null);
      },
      error: (error: unknown) => {
        this.problem.set(toProblem(error));
        this.busyId.set(null);
      },
    });
  }
}
