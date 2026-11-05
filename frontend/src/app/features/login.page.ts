import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toProblem } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Problem } from '../core/models';

const DEMO_ACCOUNTS = [
  { label: 'Utilisatrice', email: 'lea@creneau.dev', password: 'demo1234' },
  { label: 'Administratrice', email: 'admin@creneau.dev', password: 'admin1234' },
];

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <div class="split">
      <section class="pitch">
        <div class="brand">
          <img src="favicon.svg" alt="" width="36" height="36" />
          <span>Créneau</span>
        </div>
        <h1>La bonne salle, au bon moment, sans échange de mails.</h1>
        <p class="lede">
          Cherchez une salle libre selon vos besoins, réservez en deux clics. Les doubles
          réservations sont impossibles, même quand deux collègues cliquent à la même seconde.
        </p>
        <ul class="facts" aria-label="Points clés">
          <li><span class="mono">08:00 → 20:00</span> créneaux de 15 min, en semaine</li>
          <li>
            <span class="mono">409</span> conflit détecté par PostgreSQL, pas seulement par l'app
          </li>
          <li><span class="mono">JWT</span> rôles utilisateur et administrateur</li>
        </ul>
      </section>

      <section class="card panel form-card" aria-labelledby="form-title">
        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="mode() === 'login'"
            (click)="switch('login')"
          >
            Connexion
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="mode() === 'register'"
            (click)="switch('register')"
          >
            Créer un compte
          </button>
        </div>

        <h2 id="form-title" class="sr-only">
          {{ mode() === 'login' ? 'Connexion' : 'Créer un compte' }}
        </h2>

        @if (expiree()) {
          <p class="alert error" role="status">Votre session a expiré. Reconnectez-vous.</p>
        }
        @if (problem(); as p) {
          <p class="alert error" role="alert">{{ p.detail }}</p>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (mode() === 'register') {
            <label class="field">
              <span>Nom complet</span>
              <input
                class="input"
                formControlName="fullName"
                autocomplete="name"
                [class.invalid]="fieldError('fullName')"
              />
              @if (fieldError('fullName'); as message) {
                <small class="field-error">{{ message }}</small>
              }
            </label>
          }
          <label class="field">
            <span>Email</span>
            <input
              class="input"
              type="email"
              formControlName="email"
              autocomplete="email"
              [class.invalid]="fieldError('email')"
            />
            @if (fieldError('email'); as message) {
              <small class="field-error">{{ message }}</small>
            }
          </label>
          <label class="field">
            <span>Mot de passe</span>
            <input
              class="input"
              type="password"
              formControlName="password"
              [attr.autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
              [class.invalid]="fieldError('password')"
            />
            @if (fieldError('password'); as message) {
              <small class="field-error">{{ message }}</small>
            } @else if (mode() === 'register') {
              <small class="hint">8 caractères minimum.</small>
            }
          </label>
          <button class="btn accent full" type="submit" [disabled]="pending()">
            {{
              pending() ? 'Un instant…' : mode() === 'login' ? 'Se connecter' : 'Créer mon compte'
            }}
          </button>
        </form>

        @if (mode() === 'login') {
          <div class="demo">
            <p class="eyebrow">Comptes de démonstration</p>
            <div class="demo-list">
              @for (account of demoAccounts; track account.email) {
                <button
                  type="button"
                  class="demo-account"
                  (click)="useDemo(account.email, account.password)"
                >
                  <strong>{{ account.label }}</strong>
                  <span class="mono">{{ account.email }}</span>
                </button>
              }
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .split {
      min-height: 100svh;
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 48px;
      align-items: center;
      width: min(1120px, 100% - 32px);
      margin-inline: auto;
      padding-block: 40px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font: 700 1.5rem/1 var(--font-display);
      margin-bottom: 40px;
    }
    .pitch h1 {
      font-size: clamp(2rem, 1.2rem + 3vw, 3.25rem);
      max-width: 16ch;
    }
    .facts {
      list-style: none;
      padding: 0;
      margin: 32px 0 0;
      display: grid;
      gap: 12px;
      color: var(--ink-2);
      li {
        display: flex;
        gap: 12px;
        align-items: baseline;
      }
      .mono {
        flex: 0 0 auto;
        min-width: 9.5em;
        color: var(--accent-hover);
        font-size: 0.875rem;
      }
    }
    .form-card {
      display: grid;
      gap: 20px;
      padding: 28px;
    }
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 4px;
      background: var(--sunken);
      border-radius: var(--radius-sm);
      button {
        min-height: 40px;
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
    form {
      display: grid;
      gap: 16px;
    }
    .hint {
      font-size: 0.8125rem;
      color: var(--ink-3);
    }
    .full {
      width: 100%;
      margin-top: 4px;
    }
    .demo {
      display: grid;
      gap: 10px;
      padding-top: 20px;
      border-top: 1px dashed var(--line-strong);
    }
    .demo-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .demo-account {
      display: grid;
      gap: 2px;
      text-align: left;
      padding: 10px 12px;
      min-height: 44px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--paper);
      cursor: pointer;
      .mono {
        font-size: 0.75rem;
        color: var(--ink-3);
        overflow-wrap: anywhere;
      }
      &:hover {
        border-color: var(--ink-3);
      }
    }
    @media (max-width: 860px) {
      .split {
        grid-template-columns: 1fr;
        gap: 28px;
        align-items: start;
        padding-top: 28px;
      }
      .brand {
        margin-bottom: 20px;
      }
      .facts {
        display: none;
      }
    }
    @media (max-width: 420px) {
      .demo-list {
        grid-template-columns: 1fr;
      }
      .form-card {
        padding: 20px;
      }
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Paramètres d'URL : page demandée avant la connexion, et session expirée. */
  readonly suite = input<string>();
  readonly expiree = input<string>();

  protected readonly demoAccounts = DEMO_ACCOUNTS;
  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly pending = signal(false);
  protected readonly problem = signal<Problem | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected switch(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.problem.set(null);
    const fullName = this.form.controls.fullName;
    const password = this.form.controls.password;
    fullName.setValidators(
      mode === 'register' ? [Validators.required, Validators.maxLength(80)] : [],
    );
    password.setValidators(
      mode === 'register' ? [Validators.required, Validators.minLength(8)] : [Validators.required],
    );
    fullName.updateValueAndValidity();
    password.updateValueAndValidity();
  }

  protected useDemo(email: string, password: string): void {
    this.form.patchValue({ email, password });
    this.submit();
  }

  protected fieldError(name: 'fullName' | 'email' | 'password'): string | null {
    const serverMessage = this.problem()?.fields?.[name];
    if (serverMessage) return serverMessage;
    const control = this.form.controls[name];
    if (!control.touched || control.valid) return null;
    if (control.hasError('required')) return 'Champ requis.';
    if (control.hasError('email')) return 'Email invalide.';
    if (control.hasError('minlength')) return '8 caractères minimum.';
    return 'Valeur invalide.';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fullName, email, password } = this.form.getRawValue();
    this.pending.set(true);
    this.problem.set(null);
    const request =
      this.mode() === 'login'
        ? this.auth.login(email, password)
        : this.auth.register(fullName, email, password);
    request.subscribe({
      next: () => {
        const target = this.suite();
        void this.router.navigateByUrl(target?.startsWith('/') ? target : '/salles');
      },
      error: (error: unknown) => {
        this.problem.set(toProblem(error));
        this.pending.set(false);
      },
    });
  }
}
