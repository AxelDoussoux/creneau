import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, toProblem } from '../core/api.service';
import { Booking, Problem } from '../core/models';
import { BookingList } from '../shared/booking-list';

@Component({
  selector: 'app-my-bookings-page',
  imports: [RouterLink, BookingList],
  template: `
    <div class="container page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Agenda</p>
          <h1>Mes réservations</h1>
        </div>
        <div class="tabs" role="tablist" aria-label="Période">
          <button type="button" role="tab" [attr.aria-selected]="!past()" (click)="past.set(false)">
            À venir
          </button>
          <button type="button" role="tab" [attr.aria-selected]="past()" (click)="past.set(true)">
            Passées
          </button>
        </div>
      </header>

      @if (problem(); as p) {
        <p class="alert error" role="alert">{{ p.detail }}</p>
      }

      @if (bookings(); as list) {
        @if (list.length === 0) {
          <div class="card empty">
            <strong>{{
              past() ? 'Aucune réservation passée.' : 'Rien de prévu pour l’instant.'
            }}</strong>
            @if (!past()) {
              <a class="btn accent small" routerLink="/salles">Trouver une salle</a>
            }
          </div>
        } @else {
          <app-booking-list
            [bookings]="list"
            [zone]="api.rules().zone"
            [busyId]="busyId()"
            (cancel)="cancel($event)"
          />
        }
      } @else {
        <div class="skeleton" style="height: 240px"></div>
      }
    </div>
  `,
  styles: `
    .tabs {
      display: inline-grid;
      grid-auto-flow: column;
      padding: 4px;
      background: var(--sunken);
      border-radius: var(--radius-sm);
      button {
        min-height: 40px;
        padding: 0 16px;
        border: 0;
        border-radius: 4px;
        background: transparent;
        font-weight: 600;
        color: var(--ink-2);
        cursor: pointer;
        &[aria-selected='true'] {
          background: var(--surface);
          color: var(--ink);
          box-shadow: var(--shadow);
        }
      }
    }
  `,
})
export class MyBookingsPage {
  protected readonly api = inject(ApiService);
  protected readonly past = signal(false);
  protected readonly bookings = signal<Booking[] | null>(null);
  protected readonly problem = signal<Problem | null>(null);
  protected readonly busyId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const past = this.past();
      untracked(() => this.load(past));
    });
  }

  private load(past: boolean): void {
    this.bookings.set(null);
    this.problem.set(null);
    this.api.myBookings(past).subscribe({
      next: (list) => this.bookings.set(list),
      error: (error: unknown) => this.problem.set(toProblem(error)),
    });
  }

  protected cancel(booking: Booking): void {
    if (!confirm(`Annuler « ${booking.title} » en salle ${booking.roomName} ?`)) return;
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
