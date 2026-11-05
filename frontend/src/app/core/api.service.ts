import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  Booking,
  BookingInput,
  BookingRules,
  Equipment,
  Problem,
  Room,
  RoomInput,
  ScheduleSlot,
} from './models';
import { DEFAULT_ZONE } from './time';

export interface RoomSearch {
  capacity?: number;
  equipment?: Equipment[];
  from?: string;
  to?: string;
}

const FALLBACK_RULES: BookingRules = {
  zone: DEFAULT_ZONE,
  openingHour: 8,
  closingHour: 20,
  slotMinutes: 15,
  minDurationMinutes: 15,
  maxDurationMinutes: 240,
  maxAdvanceDays: 60,
  openDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** Règles de réservation servies par l'API, avec des valeurs par défaut le temps du chargement. */
  readonly rules = signal<BookingRules>(FALLBACK_RULES);

  loadRules(): Observable<BookingRules> {
    return this.http
      .get<BookingRules>('/api/booking-rules')
      .pipe(tap((rules) => this.rules.set(rules)));
  }

  searchRooms(search: RoomSearch): Observable<Room[]> {
    let params = new HttpParams().set('capacity', search.capacity ?? 1);
    if (search.equipment?.length) params = params.set('equipment', search.equipment.join(','));
    if (search.from && search.to) params = params.set('from', search.from).set('to', search.to);
    return this.http.get<Room[]>('/api/rooms', { params });
  }

  room(id: number): Observable<Room> {
    return this.http.get<Room>(`/api/rooms/${id}`);
  }

  schedule(roomId: number, day: string): Observable<ScheduleSlot[]> {
    return this.http.get<ScheduleSlot[]>(`/api/rooms/${roomId}/schedule`, {
      params: { date: day },
    });
  }

  book(input: BookingInput): Observable<Booking> {
    return this.http.post<Booking>('/api/bookings', input);
  }

  myBookings(past: boolean): Observable<Booking[]> {
    return this.http.get<Booking[]>('/api/bookings/mine', { params: { past } });
  }

  cancel(id: number): Observable<Booking> {
    return this.http.post<Booking>(`/api/bookings/${id}/cancel`, {});
  }

  adminRooms(): Observable<Room[]> {
    return this.http.get<Room[]>('/api/admin/rooms');
  }

  createRoom(input: RoomInput): Observable<Room> {
    return this.http.post<Room>('/api/admin/rooms', input);
  }

  updateRoom(id: number, input: RoomInput): Observable<Room> {
    return this.http.put<Room>(`/api/admin/rooms/${id}`, input);
  }

  setRoomActive(id: number, active: boolean): Observable<Room> {
    return this.http.patch<Room>(`/api/admin/rooms/${id}/active`, { active });
  }

  adminBookings(from: string, to: string): Observable<Booking[]> {
    return this.http.get<Booking[]>('/api/admin/bookings', { params: { from, to } });
  }
}

/** Transforme une erreur HTTP en problème lisible, quel que soit son format. */
export function toProblem(error: unknown): Problem {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return { status: 0, detail: "Impossible de joindre le serveur. Vérifiez qu'il est démarré." };
    }
    const body = error.error as Partial<Problem> | null;
    return {
      status: error.status,
      code: body?.code,
      fields: body?.fields,
      detail: body?.detail ?? 'Une erreur inattendue est survenue.',
    };
  }
  return { status: -1, detail: 'Une erreur inattendue est survenue.' };
}
