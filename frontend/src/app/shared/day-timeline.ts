import { Component, computed, input, output } from '@angular/core';
import { BookingRules, ScheduleSlot } from '../core/models';
import { minutesOf, timeOf, toTime } from '../core/time';

const HOUR_HEIGHT = 56;

/**
 * Planning vertical d'une journée. Un clic sur une zone libre propose ce créneau ;
 * les listes déroulantes du formulaire restent le chemin accessible au clavier.
 */
@Component({
  selector: 'app-day-timeline',
  template: `
    <div class="timeline" [style.height.px]="height()">
      <ol class="hours" aria-hidden="true">
        @for (hour of hours(); track hour) {
          <li [style.top.px]="(hour - rules().openingHour) * hourHeight">{{ hour }}:00</li>
        }
      </ol>

      <div class="track" (click)="onTrackClick($event)">
        @if (selection(); as sel) {
          <div
            class="selection"
            [style.top.px]="offset(sel.start)"
            [style.height.px]="offset(sel.end) - offset(sel.start)"
            [class.clash]="clash()"
          >
            <span class="mono">{{ label(sel.start) }}–{{ label(sel.end) }}</span>
          </div>
        }
        <ul class="slots" aria-label="Créneaux déjà réservés">
          @for (slot of positioned(); track slot.bookingId) {
            <li
              class="slot"
              [class.mine]="slot.mine"
              [class.short]="slot.height < 30"
              [style.top.px]="slot.top"
              [style.height.px]="slot.height"
              (click)="$event.stopPropagation()"
            >
              <span class="mono">{{ slot.from }}–{{ slot.to }}</span>
              <strong>{{ slot.title }}</strong>
              <span class="who">{{ slot.mine ? 'Vous' : slot.organizer }}</span>
            </li>
          } @empty {
            <li class="free-day">Journée entièrement libre</li>
          }
        </ul>
      </div>
    </div>
  `,
  styles: `
    .timeline {
      position: relative;
      display: grid;
      grid-template-columns: 52px 1fr;
    }
    .hours {
      list-style: none;
      margin: 0;
      padding: 0;
      position: relative;
      li {
        position: absolute;
        right: 10px;
        transform: translateY(-50%);
        font: 500 0.75rem/1 var(--font-mono);
        color: var(--ink-3);
      }
      li:first-child {
        transform: none;
      }
    }
    .track {
      position: relative;
      cursor: crosshair;
      border-left: 1px solid var(--line-strong);
      background-image: repeating-linear-gradient(
        to bottom,
        var(--line) 0,
        var(--line) 1px,
        transparent 1px,
        transparent 28px
      );
    }
    .slots {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .slot {
      position: absolute;
      left: 8px;
      right: 8px;
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 0 8px;
      padding: 4px 10px;
      overflow: hidden;
      border-radius: var(--radius-sm);
      background: repeating-linear-gradient(135deg, #e9e6df 0 6px, #e2ded5 6px 12px);
      border: 1px solid var(--line-strong);
      font-size: 0.8125rem;
      line-height: 1.35;
      cursor: not-allowed;
      .mono {
        color: var(--ink-2);
      }
      strong {
        font-weight: 600;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .who {
        color: var(--ink-3);
      }
      /* Réunion de 15 min : une seule ligne centrée, sans l'organisateur. */
      &.short {
        flex-wrap: nowrap;
        align-items: center;
        padding-block: 0;
        font-size: 0.75rem;
        line-height: 1;
        .who {
          display: none;
        }
      }
      &.mine {
        background: var(--ink);
        border-color: var(--ink);
        color: var(--paper);
        .mono,
        .who {
          color: #c9ccd3;
        }
      }
    }
    .free-day {
      position: absolute;
      top: 16px;
      left: 16px;
      font-size: 0.875rem;
      color: var(--ink-3);
      pointer-events: none;
    }
    .selection {
      position: absolute;
      left: 4px;
      right: 4px;
      z-index: 1;
      border: 2px solid var(--accent);
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      pointer-events: none;
      transition:
        top 200ms var(--ease),
        height 200ms var(--ease);
      .mono {
        position: absolute;
        right: 8px;
        bottom: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--accent-hover);
        background: var(--surface);
        padding: 1px 6px;
        border-radius: 4px;
      }
      &.clash {
        border-color: var(--danger);
        background: color-mix(in srgb, var(--danger) 12%, transparent);
      }
    }
  `,
})
export class DayTimeline {
  readonly rules = input.required<BookingRules>();
  readonly slots = input.required<ScheduleSlot[]>();
  /** Créneau choisi, en minutes depuis minuit. */
  readonly selection = input<{ start: number; end: number } | null>(null);
  readonly pick = output<number>();

  protected readonly hourHeight = HOUR_HEIGHT;
  protected readonly hours = computed(() => {
    const { openingHour, closingHour } = this.rules();
    return Array.from({ length: closingHour - openingHour + 1 }, (_, i) => openingHour + i);
  });
  protected readonly height = computed(
    () => (this.rules().closingHour - this.rules().openingHour) * HOUR_HEIGHT,
  );

  protected readonly positioned = computed(() => {
    const zone = this.rules().zone;
    return this.slots().map((slot) => {
      const start = minutesOf(slot.startsAt, zone);
      const end = minutesOf(slot.endsAt, zone);
      return {
        ...slot,
        top: this.offset(start),
        height: Math.max(this.offset(end) - this.offset(start) - 2, 18),
        from: timeOf(slot.startsAt, zone),
        to: timeOf(slot.endsAt, zone),
      };
    });
  });

  protected readonly clash = computed(() => {
    const sel = this.selection();
    if (!sel) return false;
    const zone = this.rules().zone;
    return this.slots().some(
      (slot) =>
        minutesOf(slot.startsAt, zone) < sel.end && minutesOf(slot.endsAt, zone) > sel.start,
    );
  });

  protected offset(minutes: number): number {
    return ((minutes - this.rules().openingHour * 60) / 60) * HOUR_HEIGHT;
  }

  protected label(minutes: number): string {
    return toTime(minutes);
  }

  protected onTrackClick(event: MouseEvent): void {
    const track = event.currentTarget as HTMLElement;
    const y = event.clientY - track.getBoundingClientRect().top;
    const { openingHour, closingHour, slotMinutes } = this.rules();
    const raw = openingHour * 60 + (y / HOUR_HEIGHT) * 60;
    const snapped = Math.floor(raw / slotMinutes) * slotMinutes;
    const latestStart = closingHour * 60 - slotMinutes;
    this.pick.emit(Math.min(Math.max(snapped, openingHour * 60), latestStart));
  }
}
