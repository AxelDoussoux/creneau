import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from './models';

const STORAGE_KEY = 'creneau.session';

interface Session {
  token: string;
  expiresAt: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(readStoredSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly isLoggedIn = computed(() => this.session() !== null);

  token(): string | null {
    const current = this.session();
    if (current && Date.parse(current.expiresAt) <= Date.now()) {
      this.clear();
      return null;
    }
    return current?.token ?? null;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap((response) => this.store(response)));
  }

  register(fullName: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', { fullName, email, password })
      .pipe(tap((response) => this.store(response)));
  }

  logout(): void {
    this.clear();
    void this.router.navigate(['/connexion']);
  }

  /** Appelé par l'intercepteur quand l'API répond 401 : la session n'est plus valable. */
  expire(): void {
    this.clear();
    void this.router.navigate(['/connexion'], { queryParams: { expiree: 1 } });
  }

  private store(response: AuthResponse): void {
    const session: Session = {
      token: response.token,
      expiresAt: response.expiresAt,
      user: response.user,
    };
    this.session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Stockage indisponible (navigation privée) : la session reste valable pour l'onglet.
    }
  }

  private clear(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Rien à nettoyer.
    }
  }
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return Date.parse(session.expiresAt) > Date.now() ? session : null;
  } catch {
    return null;
  }
}
