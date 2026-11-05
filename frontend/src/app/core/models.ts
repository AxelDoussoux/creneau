export type Role = 'USER' | 'ADMIN';

export type Equipment =
  'PROJECTOR' | 'SCREEN' | 'VIDEOCONFERENCE' | 'WHITEBOARD' | 'SPEAKERPHONE' | 'WHEELCHAIR_ACCESS';

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  PROJECTOR: 'Vidéoprojecteur',
  SCREEN: 'Écran',
  VIDEOCONFERENCE: 'Visio',
  WHITEBOARD: 'Tableau blanc',
  SPEAKERPHONE: 'Pieuvre audio',
  WHEELCHAIR_ACCESS: 'Accès PMR',
};

export const ALL_EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[];

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Room {
  id: number;
  name: string;
  location: string;
  description: string;
  capacity: number;
  equipment: Equipment[];
  active: boolean;
}

export interface RoomInput {
  name: string;
  location: string;
  description: string;
  capacity: number;
  equipment: Equipment[];
}

export interface ScheduleSlot {
  bookingId: number;
  startsAt: string;
  endsAt: string;
  title: string;
  organizer: string;
  mine: boolean;
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: number;
  roomId: number;
  roomName: string;
  roomLocation: string;
  title: string;
  attendees: number;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  organizer: { id: number; fullName: string };
  createdAt: string;
  cancellable: boolean;
}

export interface BookingInput {
  roomId: number;
  title: string;
  attendees: number;
  startsAt: string;
  endsAt: string;
}

export interface BookingRules {
  zone: string;
  openingHour: number;
  closingHour: number;
  slotMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  maxAdvanceDays: number;
  openDays: string[];
}

/** Corps d'erreur RFC 9457 renvoyé par l'API, enrichi d'un code stable. */
export interface Problem {
  status: number;
  detail?: string;
  code?: string;
  fields?: Record<string, string>;
}
