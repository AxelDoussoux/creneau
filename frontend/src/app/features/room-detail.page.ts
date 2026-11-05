import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, toProblem } from '../core/api.service';
import { Booking, EQUIPMENT_LABELS, Problem, Room, ScheduleSlot } from '../core/models';
import {
  addDays,
  formatDay,
  formatDuration,
  nextOpenDay,
  toMinutes,
  toTime,
  today,
  weekdayOf,
  zonedToIso,
} from '../core/time';
import { DayTimeline } from '../shared/day-timeline';
import { suggestedSlot, timeOptions } from '../shared/time-options';

@Component({
  selector: 'app-room-detail-page',
  imports: [FormsModule, RouterLink, DayTimeline],
  template: `
    <div class="container page">
      <a routerLink="/salles" class="back">← Toutes les salles</a>

      @if (room(); as r) {
        <header class="page-head">
          <div>
            <p class="eyebrow">{{ r.location }}</p>
            <h1>{{ r.name }}</h1>
            <p class="lede">{{ r.description }}</p>
          </div>
          <ul class="meta" aria-label="Caractéristiques">
            <li class="tag accent">{{ r.capacity }} places</li>
            @for (item of r.equipment; track item) {
              <li class="tag">{{ labels[item] }}</li>
            }
          </ul>
        </header>

        <div class="layout">
          <section class="card panel" aria-labelledby="day-title">
            <div class="day-nav">
              <button
                type="button"
                class="btn ghost small"
                (click)="shiftDay(-1)"
                [disabled]="day() <= minDay"
                aria-label="Jour précédent"
              >
                ←
              </button>
              <h2 id="day-title">{{ dayLabel() }}</h2>
              <button
                type="button"
                class="btn ghost small"
                (click)="shiftDay(1)"
                aria-label="Jour suivant"
              >
                →
              </button>
            </div>
            @if (closedDay()) {
              <div class="empty">
                <strong>Fermé ce jour-là.</strong><span>Les salles se réservent en semaine.</span>
              </div>
            } @else if (schedule(); as slots) {
              <app-day-timeline
                [rules]="api.rules()"
                [slots]="slots"
                [selection]="selection()"
                (pick)="pickStart($event)"
              />
            } @else {
              <div class="skeleton" style="height: 480px"></div>
            }
          </section>

          <section class="card panel booking" aria-labelledby="form-title">
            <h2 id="form-title">Réserver</h2>

            @if (confirmed(); as b) {
              <div class="alert success" role="status">
                Salle réservée de <strong>{{ timeLabel(b.startsAt) }}</strong> à
                <strong>{{ timeLabel(b.endsAt) }}</strong
                >.
                <a routerLink="/mes-reservations">Voir mes réservations</a>
              </div>
            }
            @if (problem(); as p) {
              <p class="alert error" role="alert">{{ p.detail }}</p>
            }

            <form (ngSubmit)="submit(r)" class="form">
              <label class="field">
                <span>Jour</span>
                <input
                  class="input"
                  type="date"
                  name="day"
                  [min]="minDay"
                  [ngModel]="day()"
                  (ngModelChange)="setDay($event)"
                  required
                />
              </label>
              <div class="row">
                <label class="field">
                  <span>Début</span>
                  <select
                    class="input"
                    name="start"
                    [ngModel]="start()"
                    (ngModelChange)="setStart($event)"
                  >
                    @for (option of startOptions(); track option) {
                      <option [value]="option">{{ option }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span>Fin</span>
                  <select
                    class="input"
                    name="end"
                    [ngModel]="end()"
                    (ngModelChange)="end.set($event)"
                  >
                    @for (option of endOptions(); track option) {
                      <option [value]="option">{{ option }}</option>
                    }
                  </select>
                </label>
              </div>
              <p class="duration mono">{{ durationLabel() }}</p>
              <label class="field">
                <span>Objet de la réunion</span>
                <input
                  class="input"
                  name="title"
                  maxlength="120"
                  placeholder="Point d'équipe, entretien…"
                  [(ngModel)]="title"
                  required
                  [class.invalid]="problem()?.fields?.['title']"
                />
                @if (problem()?.fields?.['title']; as message) {
                  <small class="field-error">{{ message }}</small>
                }
              </label>
              <label class="field">
                <span>Participants</span>
                <input
                  class="input"
                  type="number"
                  name="attendees"
                  min="1"
                  [max]="r.capacity"
                  inputmode="numeric"
                  [(ngModel)]="attendees"
                />
              </label>
              <button type="submit" class="btn accent" [disabled]="pending() || closedDay()">
                {{ pending() ? 'Réservation…' : 'Confirmer la réservation' }}
              </button>
            </form>
            <p class="hint">
              Astuce : cliquez sur une zone libre du planning pour y placer le début.
            </p>
          </section>
        </div>
      } @else if (loadProblem(); as p) {
        <p class="alert error" role="alert">{{ p.detail }}</p>
      } @else {
        <div class="skeleton" style="height: 320px"></div>
      }
    </div>
  `,
  styles: `
    .back {
      color: var(--ink-2);
      text-decoration: none;
      font-weight: 500;
      width: fit-content;
      padding-block: 10px;
      margin-block: -10px;
      &:hover {
        color: var(--ink);
      }
    }
    .meta {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-width: 420px;
      justify-content: flex-end;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(300px, 1fr);
      gap: 20px;
      align-items: start;
    }
    .day-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
      h2 {
        text-align: center;
      }
    }
    .booking {
      position: sticky;
      top: 84px;
      display: grid;
      gap: 16px;
    }
    .form {
      display: grid;
      gap: 14px;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .duration {
      color: var(--ink-3);
      font-size: 0.8125rem;
      margin-top: -6px;
    }
    .hint {
      font-size: 0.8125rem;
      color: var(--ink-3);
    }
    .alert a {
      color: inherit;
      font-weight: 600;
      margin-left: 4px;
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .booking {
        position: static;
        order: -1;
      }
      .meta {
        justify-content: flex-start;
      }
    }
  `,
})
export class RoomDetailPage {
  protected readonly api = inject(ApiService);

  /** Paramètres de route et d'URL, liés par withComponentInputBinding. */
  readonly id = input.required<string>();
  readonly jour = input<string>();
  readonly debut = input<string>();
  readonly fin = input<string>();
  readonly personnes = input<string>();

  protected readonly labels = EQUIPMENT_LABELS;
  protected readonly minDay = today();

  protected readonly room = signal<Room | null>(null);
  protected readonly loadProblem = signal<Problem | null>(null);
  protected readonly schedule = signal<ScheduleSlot[] | null>(null);
  protected readonly day = signal('');
  protected readonly start = signal('');
  protected readonly end = signal('');
  protected title = '';
  protected attendees = 1;

  protected readonly pending = signal(false);
  protected readonly problem = signal<Problem | null>(null);
  protected readonly confirmed = signal<Booking | null>(null);

  protected readonly startOptions = computed(() => timeOptions(this.api.rules(), false));
  protected readonly endOptions = computed(() =>
    timeOptions(this.api.rules(), true).filter(
      (option) => toMinutes(option) > toMinutes(this.start()),
    ),
  );
  protected readonly selection = computed(() =>
    this.start() && this.end()
      ? { start: toMinutes(this.start()), end: toMinutes(this.end()) }
      : null,
  );
  protected readonly dayLabel = computed(() => (this.day() ? formatDay(this.day()) : ''));
  protected readonly closedDay = computed(
    () => !!this.day() && !this.api.rules().openDays.includes(weekdayOf(this.day())),
  );
  protected readonly durationLabel = computed(() => {
    const minutes = toMinutes(this.end()) - toMinutes(this.start());
    return minutes > 0 ? `Durée : ${formatDuration(minutes)}` : '';
  });

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => this.init(id));
    });
    effect(() => {
      const id = Number(this.id());
      const day = this.day();
      if (day) untracked(() => this.loadSchedule(id, day));
    });
  }

  private init(id: number): void {
    const rules = this.api.rules();
    const fallback = suggestedSlot(rules);
    const day = this.jour() ?? fallback.day;
    // Un autre jour qu'aujourd'hui : on propose la première heure d'ouverture plutôt que l'heure courante.
    const defaultStart = day === fallback.day ? fallback.start : toTime(rules.openingHour * 60);
    const start = this.debut() ?? defaultStart;
    this.day.set(day);
    this.start.set(start);
    this.end.set(this.fin() ?? toTime(Math.min(toMinutes(start) + 60, rules.closingHour * 60)));
    this.attendees = Math.max(1, Number(this.personnes()) || 1);
    this.api.room(id).subscribe({
      next: (room) => this.room.set(room),
      error: (error: unknown) => this.loadProblem.set(toProblem(error)),
    });
  }

  private loadSchedule(id: number, day: string): void {
    this.schedule.set(null);
    this.api.schedule(id, day).subscribe({
      next: (slots) => this.schedule.set(slots),
      error: (error: unknown) => this.problem.set(toProblem(error)),
    });
  }

  protected setDay(day: string): void {
    if (day) this.day.set(day);
  }

  protected shiftDay(direction: 1 | -1): void {
    const rules = this.api.rules();
    let next = addDays(this.day(), direction);
    if (direction === 1) next = nextOpenDay(next, rules.openDays);
    else {
      for (let i = 0; i < 7 && !rules.openDays.includes(weekdayOf(next)); i++)
        next = addDays(next, -1);
    }
    if (next >= this.minDay) this.day.set(next);
  }

  protected setStart(start: string): void {
    const length = toMinutes(this.end()) - toMinutes(this.start());
    this.start.set(start);
    const closing = this.api.rules().closingHour * 60;
    this.end.set(
      toTime(Math.min(toMinutes(start) + Math.max(length, this.api.rules().slotMinutes), closing)),
    );
  }

  protected pickStart(minutes: number): void {
    this.setStart(toTime(minutes));
    this.confirmed.set(null);
  }

  protected timeLabel(iso: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: this.api.rules().zone,
    }).format(new Date(iso));
  }

  protected submit(room: Room): void {
    const zone = this.api.rules().zone;
    this.pending.set(true);
    this.problem.set(null);
    this.confirmed.set(null);
    this.api
      .book({
        roomId: room.id,
        title: this.title,
        attendees: this.attendees,
        startsAt: zonedToIso(this.day(), this.start(), zone),
        endsAt: zonedToIso(this.day(), this.end(), zone),
      })
      .subscribe({
        next: (booking) => {
          this.confirmed.set(booking);
          this.pending.set(false);
          this.title = '';
          this.loadSchedule(room.id, this.day());
        },
        error: (error: unknown) => {
          this.problem.set(toProblem(error));
          this.pending.set(false);
          // Un conflit signifie que le planning affiché est périmé : on le recharge.
          if (toProblem(error).status === 409) this.loadSchedule(room.id, this.day());
        },
      });
  }
}
