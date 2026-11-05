/**
 * Backend simulé pour la démo GitHub Pages, où aucune API Spring Boot ne tourne.
 *
 * Il reproduit les routes, les règles de réservation et le format d'erreur (ProblemDetail + code)
 * de l'API réelle, avec des données stockées dans le localStorage du visiteur.
 * Ce fichier n'est inclus que dans le build `demo`.
 */
import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  Booking,
  BookingInput,
  BookingRules,
  Equipment,
  Role,
  Room,
  RoomInput,
  ScheduleSlot,
  User,
} from '../core/models';
import {
  DEFAULT_ZONE,
  addDays,
  dayOf,
  minutesOf,
  nextOpenDay,
  today,
  weekdayOf,
  zonedToDate,
} from '../core/time';

const STORE_KEY = 'creneau.demo.db';
const LATENCY_MS = 180;

const RULES: BookingRules = {
  zone: DEFAULT_ZONE,
  openingHour: 8,
  closingHour: 20,
  slotMinutes: 15,
  minDurationMinutes: 15,
  maxDurationMinutes: 240,
  maxAdvanceDays: 60,
  openDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
};

interface StoredUser extends User {
  password: string;
}

interface StoredBooking {
  id: number;
  roomId: number;
  userId: number;
  title: string;
  attendees: number;
  startsAt: string;
  endsAt: string;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

interface Db {
  seededOn: string;
  nextId: number;
  users: StoredUser[];
  rooms: Room[];
  bookings: StoredBooking[];
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

const rule = (code: string, message: string) => new ApiError(422, code, message);

/* ---------- Stockage ---------- */

let memoryDb: Db | null = null;

function load(): Db {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    if (memoryDb) return memoryDb;
  }
  const db = seed();
  save(db);
  return db;
}

function save(db: Db): void {
  memoryDb = db;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    // Stockage indisponible : la démo reste utilisable le temps de l'onglet.
  }
}

function seed(): Db {
  const now = new Date().toISOString();
  const users: StoredUser[] = [
    {
      id: 1,
      email: 'admin@creneau.dev',
      fullName: 'Camille Admin',
      role: 'ADMIN',
      password: 'admin1234',
    },
    { id: 2, email: 'lea@creneau.dev', fullName: 'Léa Martin', role: 'USER', password: 'demo1234' },
    {
      id: 3,
      email: 'hugo@creneau.dev',
      fullName: 'Hugo Bernard',
      role: 'USER',
      password: 'demo1234',
    },
    {
      id: 4,
      email: 'ines@creneau.dev',
      fullName: 'Inès Moreau',
      role: 'USER',
      password: 'demo1234',
    },
  ];
  const room = (
    id: number,
    name: string,
    location: string,
    description: string,
    capacity: number,
    equipment: Equipment[],
  ): Room => ({
    id,
    name,
    location,
    description,
    capacity,
    equipment,
    active: true,
  });
  const rooms: Room[] = [
    room(
      10,
      'Fourvière',
      'Étage 1 · Aile nord',
      'Petite salle lumineuse pour les points rapides.',
      4,
      ['SCREEN', 'WHITEBOARD'],
    ),
    room(
      11,
      'Croix-Rousse',
      'Étage 1 · Aile sud',
      "Salle d'équipe avec écran et visioconférence.",
      8,
      ['SCREEN', 'VIDEOCONFERENCE', 'WHITEBOARD', 'WHEELCHAIR_ACCESS'],
    ),
    room(12, 'Confluence', 'Étage 2', 'Salle de réunion principale, idéale pour les comités.', 14, [
      'PROJECTOR',
      'VIDEOCONFERENCE',
      'SPEAKERPHONE',
      'WHEELCHAIR_ACCESS',
    ]),
    room(
      13,
      'Bellecour',
      'Rez-de-chaussée',
      'Grand espace modulable pour ateliers et présentations.',
      30,
      ['PROJECTOR', 'SCREEN', 'SPEAKERPHONE', 'WHITEBOARD', 'WHEELCHAIR_ACCESS'],
    ),
    room(14, 'Part-Dieu', 'Étage 3', 'Cabine isolée pour les appels et entretiens.', 2, [
      'VIDEOCONFERENCE',
    ]),
    room(15, 'Gerland', 'Étage 3', 'Salle créative avec murs inscriptibles.', 6, [
      'WHITEBOARD',
      'SCREEN',
    ]),
  ];

  // Même jeu de réservations que DemoData côté Spring Boot, sur les cinq prochains jours ouvrés.
  const pattern: [number, number, string, number, string, string][] = [
    [11, 2, 'Daily produit', 6, '09:30', '09:45'],
    [12, 3, 'Revue de sprint', 10, '14:00', '15:30'],
    [10, 4, 'Point recrutement', 3, '11:00', '11:30'],
    [13, 2, 'Atelier design system', 18, '10:00', '12:00'],
    [14, 3, 'Entretien candidat', 2, '16:00', '17:00'],
  ];
  const bookings: StoredBooking[] = [];
  let nextId = 100;
  let day = nextOpenDay(today(), RULES.openDays);
  for (let d = 0; d < 5; d++) {
    pattern.forEach(([roomId, userId, title, attendees, start, end], i) => {
      if ((d + i) % 3 === 2) return;
      const startsAt = zonedToDate(day, start).toISOString();
      if (startsAt < now) return;
      bookings.push({
        id: nextId++,
        roomId,
        userId,
        title,
        attendees,
        startsAt,
        endsAt: zonedToDate(day, end).toISOString(),
        status: 'CONFIRMED',
        createdAt: now,
      });
    });
    day = nextOpenDay(addDays(day, 1), RULES.openDays);
  }
  return { seededOn: today(), nextId, users, rooms, bookings };
}

/* ---------- Règles (miroir de BookingPolicy.java) ---------- */

function checkNewBooking(room: Room, startsAt: string, endsAt: string, attendees: number): void {
  if (!room.active) throw rule('ROOM_INACTIVE', "Cette salle n'est plus réservable.");
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!(end > start)) throw rule('INVALID_RANGE', "L'heure de fin doit suivre l'heure de début.");
  const minutes = (end - start) / 60000;
  if (minutes < RULES.minDurationMinutes || minutes > RULES.maxDurationMinutes) {
    throw rule('INVALID_DURATION', 'Une réservation dure entre 15 min et 4 h.');
  }
  const aligned = (iso: string) =>
    new Date(iso).getUTCSeconds() === 0 && minutesOf(iso) % RULES.slotMinutes === 0;
  if (!aligned(startsAt) || !aligned(endsAt)) {
    throw rule('SLOT_ALIGNMENT', 'Les horaires se calent sur des créneaux de 15 minutes.');
  }
  const day = dayOf(startsAt);
  if (!RULES.openDays.includes(weekdayOf(day))) {
    throw rule('CLOSED_DAY', "Les salles ne sont réservables qu'en semaine.");
  }
  if (
    dayOf(endsAt) !== day ||
    minutesOf(startsAt) < RULES.openingHour * 60 ||
    minutesOf(endsAt) > RULES.closingHour * 60
  ) {
    throw rule('OUTSIDE_OPENING_HOURS', 'Les salles sont ouvertes de 8h à 20h.');
  }
  if (start <= Date.now()) throw rule('IN_THE_PAST', 'Ce créneau est déjà passé.');
  if (start > Date.now() + RULES.maxAdvanceDays * 86_400_000) {
    throw rule('TOO_FAR_AHEAD', 'On réserve au plus 60 jours à l’avance.');
  }
  if (attendees > room.capacity) {
    throw rule('OVER_CAPACITY', `Cette salle accueille ${room.capacity} personnes au maximum.`);
  }
}

const overlaps = (b: StoredBooking, from: string, to: string) =>
  b.status === 'CONFIRMED' && b.startsAt < to && b.endsAt > from;

const isCancellable = (b: StoredBooking) =>
  b.status === 'CONFIRMED' && Date.parse(b.startsAt) > Date.now();

/* ---------- Routes ---------- */

interface Ctx {
  db: Db;
  req: HttpRequest<unknown>;
  params: URLSearchParams;
  user: StoredUser | null;
}

function requireUser(ctx: Ctx): StoredUser {
  if (!ctx.user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentification requise.');
  return ctx.user;
}

function requireAdmin(ctx: Ctx): StoredUser {
  const user = requireUser(ctx);
  if (user.role !== 'ADMIN')
    throw new ApiError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs.');
  return user;
}

function toUser({ password: _password, ...user }: StoredUser): User {
  return user;
}

function auth(user: StoredUser) {
  return {
    token: `demo.${user.id}`,
    expiresAt: new Date(Date.now() + 8 * 3_600_000).toISOString(),
    user: toUser(user),
  };
}

function toBooking(db: Db, b: StoredBooking): Booking {
  const room = db.rooms.find((r) => r.id === b.roomId)!;
  const user = db.users.find((u) => u.id === b.userId)!;
  return {
    id: b.id,
    roomId: room.id,
    roomName: room.name,
    roomLocation: room.location,
    title: b.title,
    attendees: b.attendees,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    status: b.status,
    organizer: { id: user.id, fullName: user.fullName },
    createdAt: b.createdAt,
    cancellable: isCancellable(b),
  };
}

function findRoom(db: Db, id: number): Room {
  const room = db.rooms.find((r) => r.id === id);
  if (!room) throw new ApiError(404, 'NOT_FOUND', 'Salle introuvable.');
  return room;
}

function validateRoom(db: Db, input: RoomInput, id?: number): void {
  const fields: Record<string, string> = {};
  if (!input.name?.trim()) fields['name'] = 'Le nom est requis.';
  if (!(input.capacity >= 1 && input.capacity <= 200))
    fields['capacity'] = 'Entre 1 et 200 places.';
  if (Object.keys(fields).length) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.', fields);
  }
  const taken = db.rooms.some(
    (r) => r.id !== id && r.name.toLowerCase() === input.name.trim().toLowerCase(),
  );
  if (taken) throw new ApiError(409, 'ROOM_NAME_TAKEN', 'Une salle porte déjà ce nom.');
}

type Handler = (ctx: Ctx, match: RegExpMatchArray) => unknown;

const routes: [string, RegExp, Handler][] = [
  [
    'POST',
    /^\/api\/auth\/login$/,
    ({ db, req }) => {
      const { email, password } = req.body as { email: string; password: string };
      const user = db.users.find((u) => u.email === email?.trim().toLowerCase());
      if (!user || user.password !== password) {
        throw new ApiError(401, 'BAD_CREDENTIALS', 'Email ou mot de passe incorrect.');
      }
      return auth(user);
    },
  ],
  [
    'POST',
    /^\/api\/auth\/register$/,
    ({ db, req }) => {
      const body = req.body as { email: string; fullName: string; password: string };
      const email = body.email?.trim().toLowerCase() ?? '';
      const fields: Record<string, string> = {};
      if (!/^[^@\s]+@[^@\s]+$/.test(email)) fields['email'] = 'Email invalide.';
      if (!body.fullName?.trim()) fields['fullName'] = 'Le nom est requis.';
      if ((body.password ?? '').length < 8) fields['password'] = 'Entre 8 et 72 caractères.';
      if (Object.keys(fields).length) {
        throw new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.', fields);
      }
      if (db.users.some((u) => u.email === email)) {
        throw new ApiError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet email.');
      }
      const user: StoredUser = {
        id: db.nextId++,
        email,
        fullName: body.fullName.trim(),
        role: 'USER' as Role,
        password: body.password,
      };
      db.users.push(user);
      return auth(user);
    },
  ],
  ['GET', /^\/api\/me$/, (ctx) => toUser(requireUser(ctx))],
  ['GET', /^\/api\/booking-rules$/, (ctx) => (requireUser(ctx), RULES)],
  [
    'GET',
    /^\/api\/rooms$/,
    (ctx) => {
      requireUser(ctx);
      const capacity = Math.max(1, Number(ctx.params.get('capacity') ?? 1));
      const equipment = (ctx.params.get('equipment') ?? '').split(',').filter(Boolean);
      const from = ctx.params.get('from');
      const to = ctx.params.get('to');
      if (from && to && !(Date.parse(to) > Date.parse(from))) {
        throw rule('INVALID_RANGE', "L'heure de fin doit suivre l'heure de début.");
      }
      return ctx.db.rooms
        .filter((r) => r.active && r.capacity >= capacity)
        .filter((r) => equipment.every((e) => r.equipment.includes(e as Equipment)))
        .filter(
          (r) =>
            !from ||
            !to ||
            !ctx.db.bookings.some((b) => b.roomId === r.id && overlaps(b, from, to)),
        )
        .sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name));
    },
  ],
  ['GET', /^\/api\/rooms\/(\d+)$/, (ctx, m) => (requireUser(ctx), findRoom(ctx.db, Number(m[1])))],
  [
    'GET',
    /^\/api\/rooms\/(\d+)\/schedule$/,
    (ctx, m): ScheduleSlot[] => {
      const user = requireUser(ctx);
      const room = findRoom(ctx.db, Number(m[1]));
      const day = ctx.params.get('date') ?? today();
      const from = zonedToDate(day, '00:00').toISOString();
      const to = zonedToDate(addDays(day, 1), '00:00').toISOString();
      return ctx.db.bookings
        .filter((b) => b.roomId === room.id && overlaps(b, from, to))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((b) => ({
          bookingId: b.id,
          startsAt: b.startsAt,
          endsAt: b.endsAt,
          title: b.title,
          organizer: ctx.db.users.find((u) => u.id === b.userId)!.fullName,
          mine: b.userId === user.id,
        }));
    },
  ],
  [
    'GET',
    /^\/api\/bookings\/mine$/,
    (ctx) => {
      const user = requireUser(ctx);
      const past = ctx.params.get('past') === 'true';
      const now = new Date().toISOString();
      return ctx.db.bookings
        .filter((b) => b.userId === user.id && (past ? b.endsAt <= now : b.endsAt > now))
        .sort((a, b) =>
          past ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt),
        )
        .map((b) => toBooking(ctx.db, b));
    },
  ],
  [
    'POST',
    /^\/api\/bookings$/,
    (ctx) => {
      const user = requireUser(ctx);
      const input = ctx.req.body as BookingInput;
      const fields: Record<string, string> = {};
      if (!input.title?.trim()) fields['title'] = 'Donnez un titre à la réunion.';
      if (!(input.attendees >= 1)) fields['attendees'] = 'Au moins 1 participant.';
      if (Object.keys(fields).length) {
        throw new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.', fields);
      }
      const room = findRoom(ctx.db, input.roomId);
      checkNewBooking(room, input.startsAt, input.endsAt, input.attendees);
      if (
        ctx.db.bookings.some(
          (b) => b.roomId === room.id && overlaps(b, input.startsAt, input.endsAt),
        )
      ) {
        throw new ApiError(
          409,
          'SLOT_TAKEN',
          'Ce créneau est déjà pris dans cette salle. Choisissez un autre horaire.',
        );
      }
      const booking: StoredBooking = {
        id: ctx.db.nextId++,
        roomId: room.id,
        userId: user.id,
        title: input.title.trim(),
        attendees: input.attendees,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      };
      ctx.db.bookings.push(booking);
      return toBooking(ctx.db, booking);
    },
  ],
  [
    'POST',
    /^\/api\/bookings\/(\d+)\/cancel$/,
    (ctx, m) => {
      const user = requireUser(ctx);
      const booking = ctx.db.bookings.find((b) => b.id === Number(m[1]));
      if (!booking) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable.');
      if (user.role !== 'ADMIN' && booking.userId !== user.id) {
        throw new ApiError(
          403,
          'FORBIDDEN',
          "Seul l'organisateur ou un administrateur peut annuler cette réservation.",
        );
      }
      if (booking.status === 'CANCELLED') {
        throw new ApiError(409, 'ALREADY_CANCELLED', 'Cette réservation est déjà annulée.');
      }
      if (Date.parse(booking.startsAt) <= Date.now()) {
        throw rule('ALREADY_STARTED', 'Une réunion commencée ne peut plus être annulée.');
      }
      booking.status = 'CANCELLED';
      return toBooking(ctx.db, booking);
    },
  ],
  [
    'GET',
    /^\/api\/admin\/rooms$/,
    (ctx) => (requireAdmin(ctx), [...ctx.db.rooms].sort((a, b) => a.name.localeCompare(b.name))),
  ],
  [
    'POST',
    /^\/api\/admin\/rooms$/,
    (ctx) => {
      requireAdmin(ctx);
      const input = ctx.req.body as RoomInput;
      validateRoom(ctx.db, input);
      const room: Room = { id: ctx.db.nextId++, ...input, name: input.name.trim(), active: true };
      ctx.db.rooms.push(room);
      return room;
    },
  ],
  [
    'PUT',
    /^\/api\/admin\/rooms\/(\d+)$/,
    (ctx, m) => {
      requireAdmin(ctx);
      const room = findRoom(ctx.db, Number(m[1]));
      const input = ctx.req.body as RoomInput;
      validateRoom(ctx.db, input, room.id);
      Object.assign(room, input, { name: input.name.trim() });
      return room;
    },
  ],
  [
    'PATCH',
    /^\/api\/admin\/rooms\/(\d+)\/active$/,
    (ctx, m) => {
      requireAdmin(ctx);
      const room = findRoom(ctx.db, Number(m[1]));
      room.active = (ctx.req.body as { active: boolean }).active;
      return room;
    },
  ],
  [
    'GET',
    /^\/api\/admin\/bookings$/,
    (ctx) => {
      requireAdmin(ctx);
      const from = zonedToDate(ctx.params.get('from') ?? today(), '00:00').toISOString();
      const to = zonedToDate(addDays(ctx.params.get('to') ?? today(), 1), '00:00').toISOString();
      return ctx.db.bookings
        .filter((b) => b.startsAt < to && b.endsAt > from)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((b) => toBooking(ctx.db, b));
    },
  ],
];

function handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const url = new URL(req.urlWithParams, location.origin);
  const db = load();
  const token = req.headers.get('Authorization')?.replace('Bearer demo.', '');
  const user = token ? (db.users.find((u) => u.id === Number(token)) ?? null) : null;
  const ctx: Ctx = { db, req, params: url.searchParams, user };

  try {
    for (const [method, pattern, handler] of routes) {
      const match = url.pathname.match(pattern);
      if (match && method === req.method) {
        const body = handler(ctx, match);
        save(db);
        const status =
          req.method === 'POST' &&
          !url.pathname.includes('/cancel') &&
          !url.pathname.includes('/login')
            ? 201
            : 200;
        return of(new HttpResponse({ status, body })).pipe(delay(LATENCY_MS));
      }
    }
    throw new ApiError(404, 'NOT_FOUND', 'Route inconnue.');
  } catch (error) {
    const e =
      error instanceof ApiError
        ? error
        : new ApiError(500, 'INTERNAL', 'Erreur interne de la démo.');
    const response = new HttpErrorResponse({
      status: e.status,
      url: req.url,
      error: { status: e.status, detail: e.message, code: e.code, fields: e.fields },
    });
    return throwError(() => response).pipe(delay(LATENCY_MS));
  }
}

/** Intercepte tous les appels /api et y répond localement. */
export const demoBackendInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith('/api/') ? handle(req) : next(req);
