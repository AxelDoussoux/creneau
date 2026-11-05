import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, toProblem } from '../core/api.service';
import {
  ALL_EQUIPMENT,
  EQUIPMENT_LABELS,
  Equipment,
  Problem,
  Room,
  RoomInput,
} from '../core/models';

@Component({
  selector: 'app-admin-rooms-page',
  imports: [ReactiveFormsModule],
  template: `
    <div class="container page">
      <header class="page-head">
        <div>
          <p class="eyebrow">Administration</p>
          <h1>Salles</h1>
          <p class="lede">Une salle archivée n'est plus réservable mais garde son historique.</p>
        </div>
        @if (editing() === null) {
          <button type="button" class="btn accent" (click)="startCreate()">
            Ajouter une salle
          </button>
        }
      </header>

      @if (problem(); as p) {
        <p class="alert error" role="alert">{{ p.detail }}</p>
      }

      @if (editing() !== null) {
        <form
          class="card panel editor"
          [formGroup]="form"
          (ngSubmit)="save()"
          aria-labelledby="editor-title"
        >
          <h2 id="editor-title">
            {{ editing() === 'new' ? 'Nouvelle salle' : 'Modifier la salle' }}
          </h2>
          <div class="row">
            <label class="field">
              <span>Nom</span>
              <input
                class="input"
                formControlName="name"
                maxlength="60"
                [class.invalid]="invalid('name')"
              />
              @if (invalid('name'); as message) {
                <small class="field-error">{{ message }}</small>
              }
            </label>
            <label class="field">
              <span>Emplacement</span>
              <input
                class="input"
                formControlName="location"
                maxlength="80"
                placeholder="Étage 2 · Aile nord"
              />
            </label>
            <label class="field">
              <span>Places</span>
              <input
                class="input"
                type="number"
                formControlName="capacity"
                min="1"
                max="200"
                inputmode="numeric"
                [class.invalid]="invalid('capacity')"
              />
              @if (invalid('capacity'); as message) {
                <small class="field-error">{{ message }}</small>
              }
            </label>
          </div>
          <label class="field">
            <span>Description</span>
            <textarea class="input" formControlName="description" maxlength="500"></textarea>
          </label>
          <fieldset class="needs">
            <legend>Équipements</legend>
            <div class="chips">
              @for (item of equipmentList; track item) {
                <button
                  type="button"
                  class="chip"
                  [attr.aria-pressed]="equipment().has(item)"
                  (click)="toggle(item)"
                >
                  {{ labels[item] }}
                </button>
              }
            </div>
          </fieldset>
          <div class="actions">
            <button type="button" class="btn ghost" (click)="editing.set(null)">Annuler</button>
            <button type="submit" class="btn accent" [disabled]="pending()">
              {{ pending() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      }

      @if (rooms(); as list) {
        <div class="card table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Salle</th>
                <th scope="col">Places</th>
                <th scope="col">Équipements</th>
                <th scope="col">État</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (room of list; track room.id) {
                <tr [class.archived]="!room.active">
                  <td>
                    <strong>{{ room.name }}</strong>
                    <span class="sub">{{ room.location }}</span>
                  </td>
                  <td class="mono">{{ room.capacity }}</td>
                  <td>
                    <span class="equip">
                      @for (item of room.equipment; track item) {
                        <span class="tag">{{ labels[item] }}</span>
                      }
                    </span>
                  </td>
                  <td>
                    <span class="tag" [class.ok]="room.active" [class.muted]="!room.active">{{
                      room.active ? 'Active' : 'Archivée'
                    }}</span>
                  </td>
                  <td class="row-actions">
                    <button type="button" class="btn ghost small" (click)="startEdit(room)">
                      Modifier
                    </button>
                    <button
                      type="button"
                      class="btn small"
                      [class.danger]="room.active"
                      [class.ghost]="!room.active"
                      (click)="toggleActive(room)"
                    >
                      {{ room.active ? 'Archiver' : 'Réactiver' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="skeleton" style="height: 280px"></div>
      }
    </div>
  `,
  styles: `
    .editor {
      display: grid;
      gap: 16px;
    }
    .row {
      display: grid;
      grid-template-columns: 1.4fr 1.4fr 0.6fr;
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
      gap: 8px;
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 720px;
    }
    th {
      text-align: left;
      font: 500 0.75rem/1 var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink-3);
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    tr:last-child td {
      border-bottom: 0;
    }
    tr.archived td {
      color: var(--ink-3);
    }
    .sub {
      display: block;
      font-size: 0.8125rem;
      color: var(--ink-3);
    }
    .equip {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .row-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    @media (max-width: 760px) {
      .row {
        grid-template-columns: 1fr;
      }
      .actions .btn {
        flex: 1;
      }
    }
  `,
})
export class AdminRoomsPage {
  private readonly api = inject(ApiService);

  protected readonly labels = EQUIPMENT_LABELS;
  protected readonly equipmentList = ALL_EQUIPMENT;
  protected readonly rooms = signal<Room[] | null>(null);
  protected readonly editing = signal<'new' | number | null>(null);
  protected readonly equipment = signal(new Set<Equipment>());
  protected readonly pending = signal(false);
  protected readonly problem = signal<Problem | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    location: [''],
    description: [''],
    capacity: [6, [Validators.required, Validators.min(1), Validators.max(200)]],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.api.adminRooms().subscribe({
      next: (rooms) => this.rooms.set(rooms),
      error: (error: unknown) => this.problem.set(toProblem(error)),
    });
  }

  protected startCreate(): void {
    this.form.reset();
    this.equipment.set(new Set());
    this.problem.set(null);
    this.editing.set('new');
  }

  protected startEdit(room: Room): void {
    this.form.setValue({
      name: room.name,
      location: room.location,
      description: room.description,
      capacity: room.capacity,
    });
    this.equipment.set(new Set(room.equipment));
    this.problem.set(null);
    this.editing.set(room.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected toggle(item: Equipment): void {
    const next = new Set(this.equipment());
    if (next.has(item)) next.delete(item);
    else next.add(item);
    this.equipment.set(next);
  }

  protected invalid(name: 'name' | 'capacity'): string | null {
    const server = this.problem()?.fields?.[name];
    if (server) return server;
    const control = this.form.controls[name];
    if (!control.touched || control.valid) return null;
    return name === 'name' ? 'Le nom est requis.' : 'Entre 1 et 200 places.';
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const input: RoomInput = { ...this.form.getRawValue(), equipment: [...this.equipment()] };
    const target = this.editing();
    const request =
      target === 'new' || target === null
        ? this.api.createRoom(input)
        : this.api.updateRoom(target, input);
    this.pending.set(true);
    this.problem.set(null);
    request.subscribe({
      next: () => {
        this.pending.set(false);
        this.editing.set(null);
        this.load();
      },
      error: (error: unknown) => {
        this.problem.set(toProblem(error));
        this.pending.set(false);
      },
    });
  }

  protected toggleActive(room: Room): void {
    if (room.active && !confirm(`Archiver ${room.name} ? Elle ne sera plus réservable.`)) return;
    this.api.setRoomActive(room.id, !room.active).subscribe({
      next: (updated) =>
        this.rooms.update(
          (list) => list?.map((item) => (item.id === updated.id ? updated : item)) ?? null,
        ),
      error: (error: unknown) => this.problem.set(toProblem(error)),
    });
  }
}
