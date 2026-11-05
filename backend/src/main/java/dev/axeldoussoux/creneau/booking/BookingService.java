package dev.axeldoussoux.creneau.booking;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import dev.axeldoussoux.creneau.booking.BookingDtos.BookingResponse;
import dev.axeldoussoux.creneau.booking.BookingDtos.CreateBookingRequest;
import dev.axeldoussoux.creneau.common.ApiException;
import dev.axeldoussoux.creneau.common.CurrentUser;
import dev.axeldoussoux.creneau.config.AppProperties;
import dev.axeldoussoux.creneau.room.Room;
import dev.axeldoussoux.creneau.room.RoomDtos.ScheduleSlot;
import dev.axeldoussoux.creneau.room.RoomRepository;
import dev.axeldoussoux.creneau.user.AppUser;
import dev.axeldoussoux.creneau.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private static final String OVERLAP_CONSTRAINT = "booking_no_overlap";
    private static final int MAX_ADMIN_RANGE_DAYS = 62;

    private final BookingRepository bookings;
    private final RoomRepository rooms;
    private final UserRepository users;
    private final BookingPolicy policy;
    private final ZoneId zone;
    private final Clock clock;

    BookingService(BookingRepository bookings, RoomRepository rooms, UserRepository users, BookingPolicy policy,
            AppProperties properties, Clock clock) {
        this.bookings = bookings;
        this.rooms = rooms;
        this.users = users;
        this.policy = policy;
        this.zone = properties.zone();
        this.clock = clock;
    }

    @Transactional
    public BookingResponse create(CurrentUser caller, CreateBookingRequest request) {
        Room room = rooms.findById(request.roomId())
                .orElseThrow(() -> ApiException.notFound("Salle introuvable."));
        policy.checkNewBooking(room, request.startsAt(), request.endsAt(), request.attendees());

        // Vérification rapide pour un message clair. Elle ne suffit pas sous concurrence :
        // deux requêtes simultanées peuvent toutes deux la passer, d'où la contrainte d'exclusion SQL.
        if (bookings.existsOverlap(room.getId(), request.startsAt(), request.endsAt(), BookingStatus.CONFIRMED)) {
            throw slotTaken();
        }

        AppUser user = users.findById(caller.id())
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable."));
        Booking booking = new Booking(room, user, request.title(), request.attendees(), request.startsAt(),
                request.endsAt(), clock.instant());
        try {
            bookings.saveAndFlush(booking);
        } catch (DataIntegrityViolationException ex) {
            if (isOverlapViolation(ex)) {
                throw slotTaken();
            }
            throw ex;
        }
        return BookingResponse.of(booking, policy.isCancellable(booking));
    }

    @Transactional
    public BookingResponse cancel(CurrentUser caller, long bookingId) {
        Booking booking = bookings.findDetailed(bookingId)
                .orElseThrow(() -> ApiException.notFound("Réservation introuvable."));
        if (!caller.admin() && !booking.isOwnedBy(caller.id())) {
            throw ApiException.forbidden("Seul l'organisateur ou un administrateur peut annuler cette réservation.");
        }
        policy.checkCancellable(booking);
        booking.cancel(clock.instant());
        return BookingResponse.of(booking, false);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> mine(CurrentUser caller, boolean past) {
        Instant now = clock.instant();
        List<Booking> found = past
                ? bookings.findPastForUser(caller.id(), now)
                : bookings.findUpcomingForUser(caller.id(), now);
        return found.stream().map(booking -> BookingResponse.of(booking, policy.isCancellable(booking))).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> between(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw ApiException.rule("INVALID_RANGE", "La date de fin doit suivre la date de début.");
        }
        if (from.plusDays(MAX_ADMIN_RANGE_DAYS).isBefore(to)) {
            throw ApiException.rule("RANGE_TOO_WIDE",
                    "Consultez au plus %d jours à la fois.".formatted(MAX_ADMIN_RANGE_DAYS));
        }
        Instant start = from.atStartOfDay(zone).toInstant();
        Instant end = to.plusDays(1).atStartOfDay(zone).toInstant();
        return bookings.findAllBetween(start, end).stream()
                .map(booking -> BookingResponse.of(booking, policy.isCancellable(booking)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleSlot> schedule(long roomId, LocalDate date, CurrentUser caller) {
        if (!rooms.existsById(roomId)) {
            throw ApiException.notFound("Salle introuvable.");
        }
        Instant start = date.atStartOfDay(zone).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();
        return bookings.findForRoom(roomId, start, end, BookingStatus.CONFIRMED).stream()
                .map(booking -> new ScheduleSlot(booking.getId(), booking.getStartsAt(), booking.getEndsAt(),
                        booking.getTitle(), booking.getUser().getFullName(), booking.isOwnedBy(caller.id())))
                .toList();
    }

    private static ApiException slotTaken() {
        return ApiException.conflict("SLOT_TAKEN", "Ce créneau est déjà pris dans cette salle. Choisissez un autre horaire.");
    }

    private static boolean isOverlapViolation(DataIntegrityViolationException ex) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause.getMessage() != null && cause.getMessage().contains(OVERLAP_CONSTRAINT)) {
                return true;
            }
        }
        return false;
    }
}
