import { Component, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from './core/api.service';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip" href="#contenu">Aller au contenu</a>
    @if (auth.user(); as user) {
      <header class="bar">
        <div class="container bar-inner">
          <a routerLink="/salles" class="brand" aria-label="Créneau, accueil">
            <img src="favicon.svg" alt="" width="28" height="28" />
            <span>Créneau</span>
          </a>

          <button
            type="button"
            class="menu-toggle"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="nav"
            (click)="menuOpen.set(!menuOpen())"
          >
            <span class="sr-only">Menu</span>
            <span class="burger" aria-hidden="true"></span>
          </button>

          <nav id="nav" class="nav" [class.open]="menuOpen()" aria-label="Navigation principale">
            <a routerLink="/salles" routerLinkActive="active">Trouver une salle</a>
            <a routerLink="/mes-reservations" routerLinkActive="active">Mes réservations</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin/salles" routerLinkActive="active">Salles</a>
              <a routerLink="/admin/planning" routerLinkActive="active">Planning</a>
            }
            <div class="who">
              <span class="who-name">{{ user.fullName }}</span>
              @if (auth.isAdmin()) {
                <span class="tag accent">Admin</span>
              }
              <button type="button" class="btn ghost small" (click)="auth.logout()">
                Déconnexion
              </button>
            </div>
          </nav>
        </div>
      </header>
    }
    <main id="contenu">
      <router-outlet />
    </main>
  `,
  styles: `
    .skip {
      position: absolute;
      left: 16px;
      top: -48px;
      z-index: 20;
      padding: 8px 12px;
      background: var(--ink);
      color: var(--paper);
      border-radius: var(--radius-sm);
      &:focus {
        top: 12px;
      }
    }
    .bar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: color-mix(in srgb, var(--paper) 88%, transparent);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--line);
    }
    .bar-inner {
      display: flex;
      align-items: center;
      gap: 24px;
      min-height: 64px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      font: 700 1.25rem/1 var(--font-display);
      letter-spacing: -0.02em;
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      a {
        padding: 8px 12px;
        border-radius: var(--radius-sm);
        text-decoration: none;
        color: var(--ink-2);
        font-weight: 500;
        &:hover {
          color: var(--ink);
          background: var(--sunken);
        }
        &.active {
          color: var(--ink);
          background: var(--surface);
          box-shadow: inset 0 0 0 1px var(--line);
        }
      }
    }
    .who {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .who-name {
      font-weight: 500;
    }
    .menu-toggle {
      display: none;
    }
    @media (max-width: 860px) {
      .bar-inner {
        justify-content: space-between;
      }
      .menu-toggle {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border: 1px solid var(--line-strong);
        border-radius: var(--radius-sm);
        background: var(--surface);
        cursor: pointer;
      }
      .burger,
      .burger::before,
      .burger::after {
        display: block;
        width: 18px;
        height: 2px;
        background: var(--ink);
        position: relative;
      }
      .burger::before,
      .burger::after {
        content: '';
        position: absolute;
        left: 0;
      }
      .burger::before {
        top: -6px;
      }
      .burger::after {
        top: 6px;
      }
      .nav {
        display: none;
        position: absolute;
        inset: 64px 0 auto;
        flex-direction: column;
        align-items: stretch;
        padding: 12px 16px 16px;
        background: var(--paper);
        border-bottom: 1px solid var(--line);
        a {
          padding: 12px;
        }
        &.open {
          display: flex;
        }
      }
      .who {
        margin: 8px 0 0;
        padding-top: 12px;
        border-top: 1px solid var(--line);
        flex-wrap: wrap;
      }
    }
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  protected readonly menuOpen = signal(false);

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));

    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.api.loadRules().subscribe({ error: () => undefined });
      }
    });
  }
}
