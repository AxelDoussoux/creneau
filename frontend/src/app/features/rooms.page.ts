import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, toProblem } from '../core/api.service';
import { ALL_EQUIPMENT, EQUIPMENT_LABELS, Equipment, Problem, Room } from '../core/models';
import { formatDay, formatDuration, toMinutes, today, zonedToIso } from '../core/time';
import { suggestedSlot, timeOptions } from '../shared/time-options';

@Component({
  selector: 'app-rooms-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <header>
        <p class="eyebrow">Recherche</p>
        <h1>Trouver une salle libre</h1>
        <p class="lede">
          Indiquez quand et pour combien de personnes : seules les salles libres sur tout le créneau
          s'affichent.
        </p>
      </header>

      <form class="card panel search" (ngSubmit)="search()" aria-label="Critères de recherche">
        <div class="when">
          <label class="field">
            <span>Jour</span>
            <input class="input" type="date" name="day" [min]="minDay" [(ngModel)]="day" required />
          </label>
          <label class="field">
            <span>Début</span>
            <select class="input" name="start" [(ngModel)]="start">
              @for (option of startOptions(); track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Fin</span>
            <select class="input" name="end" [(ngModel)]="end">
              @for (option of endOptions(); track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Participants</span>
            <input
              class="input"
              type="number"
              name="capacity"
              min="1"
              max="200"
              inputmode="numeric"
              [(ngModel)]="capacity"
            />
          </label>
        </div>

        <fieldset class="needs">
          <legend>Équipements requis</legend>
          <div class="chips">
            @for (item of equipmentList; track item) {
              <button
                type="button"
                class="chip"
                [attr.aria-pressed]="required().has(item)"
                (click)="toggle(item)"
              >
                {{ labels[item] }}
              </button>
            }
          </div>
        </fieldset>

        <div class="actions">
          <button class="btn accent" type="submit" [disabled]="loading()">
            Voir les salles libres
          </button>
        </div>
      </form>

      <section aria-live="polite" aria-busy="{{ loading() }}">
        @if (problem(); as p) {
          <p class="alert error" role="alert">{{ p.detail }}</p>
        } @else if (loading()) {
          <div class="grid">
            @for (i of [1, 2, 3]; track i) {
              <div class="skeleton" style="height: 180px"></div>
            }
          </div>
        } @else if (results(); as rooms) {
          <div class="result-head">
            <h2>
              {{ rooms.length }} salle{{ rooms.length > 1 ? 's' : '' }} libre{{
                rooms.length > 1 ? 's' : ''
              }}
            </h2>
            <p class="mono">{{ searchedLabel() }}</p>
          </div>
          @if (rooms.length === 0) {
            <div class="card empty">
              <strong>Aucune salle ne correspond.</strong>
              <span>Essayez un autre horaire, ou retirez un équipement.</span>
            </div>
          } @else {
            <ul class="grid">
              @for (room of rooms; track room.id) {
                <li class="card room">
                  <div class="room-top">
                    <h3>{{ room.name }}</h3>
                    <span class="seats mono" [attr.aria-label]="room.capacity + ' places'"
                      >{{ room.capacity }} pl.</span
                    >
                  </div>
                  <p class="where">{{ room.location }}</p>
                  @if (room.description) {
                    <p class="desc">{{ room.description }}</p>
                  }
                  <ul class="equip" aria-label="Équipements">
                    @for (item of room.equipment; track item) {
                      <li class="tag">{{ labels[item] }}</li>
                    }
                  </ul>
                  <a
                    class="btn small"
                    [routerLink]="['/salles', room.id]"
                    [queryParams]="{
                      jour: searched()?.day,
                      debut: searched()?.start,
                      fin: searched()?.end,
                      personnes: searched()?.capacity,
                    }"
                  >
                    Réserver {{ searched()?.start }}–{{ searched()?.end }}
                  </a>
                </li>
              }
            </ul>
          }
        }
      </section>
    </div>
  `,
  styles: `
    .search {
      display: grid;
      gap: 20px;
    }
    .when {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
      gap: 12px;
    }
    .needs {
      border: 0;
      padding: 0;
      margin: 0;
      legend {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--ink-2);
        margin-bottom: 8px;
      }
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    .result-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: 4px 16px;
      margin-bottom: 16px;
      .mono {
        color: var(--ink-3);
        font-size: 0.875rem;
      }
    }
    .grid {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
      gap: 16px;
    }
    .room {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 20px;
    }
    .room-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    .seats {
      color: var(--accent-hover);
      font-size: 0.875rem;
      white-space: nowrap;
    }
    .where {
      color: var(--ink-3);
      font-size: 0.875rem;
    }
    .desc {
      color: var(--ink-2);
      font-size: 0.9375rem;
    }
    .equip {
      list-style: none;
      padding: 0;
      margin: 4px 0 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .room .btn {
      margin-top: auto;
      align-self: flex-start;
    }
    @media (max-width: 760px) {
      .when {
        grid-template-columns: 1fr 1fr;
      }
      .when .field:first-child {
        grid-column: 1 / -1;
      }
      .actions .btn {
        width: 100%;
      }
    }
  `,
})
export class RoomsPage {
  private readonly api = inject(ApiService);

  protected readonly labels = EQUIPMENT_LABELS;
  protected readonly equipmentList = ALL_EQUIPMENT;
  protected readonly minDay = today();

  protected day = '';
  protected start = '';
  protected end = '';
  protected capacity = 2;

  protected readonly required = signal(new Set<Equipment>());
  protected readonly loading = signal(false);
  protected readonly problem = signal<Problem | null>(null);
  protected readonly results = signal<Room[] | null>(null);
  protected readonly searched = signal<{
    day: string;
    start: string;
    end: string;
    capacity: number;
  } | null>(null);

  protected readonly startOptions = computed(() => timeOptions(this.api.rules(), false));
  protected readonly endOptions = computed(() => timeOptions(this.api.rules(), true).slice(1));
  protected readonly searchedLabel = computed(() => {
    const s = this.searched();
    if (!s) return '';
    return `${formatDay(s.day)} · ${s.start}–${s.end} · ${formatDuration(toMinutes(s.end) - toMinutes(s.start))}`;
  });

  constructor() {
    const slot = suggestedSlot(this.api.rules());
    this.day = slot.day;
    this.start = slot.start;
    this.end = slot.end;
    this.search();
  }

  protected toggle(item: Equipment): void {
    const next = new Set(this.required());
    if (next.has(item)) next.delete(item);
    else next.add(item);
    this.required.set(next);
  }

  protected search(): void {
    if (!this.day) return;
    if (toMinutes(this.end) <= toMinutes(this.start)) {
      this.problem.set({ status: 0, detail: "L'heure de fin doit suivre l'heure de début." });
      this.results.set(null);
      return;
    }
    const zone = this.api.rules().zone;
    const criteria = {
      day: this.day,
      start: this.start,
      end: this.end,
      capacity: Math.max(1, this.capacity || 1),
    };
    this.loading.set(true);
    this.problem.set(null);
    this.api
      .searchRooms({
        capacity: criteria.capacity,
        equipment: [...this.required()],
        from: zonedToIso(criteria.day, criteria.start, zone),
        to: zonedToIso(criteria.day, criteria.end, zone),
      })
      .subscribe({
        next: (rooms) => {
          this.results.set(rooms);
          this.searched.set(criteria);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.problem.set(toProblem(error));
          this.loading.set(false);
        },
      });
  }
}
