package dev.axeldoussoux.creneau.booking;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import dev.axeldoussoux.creneau.booking.BookingDtos.BookingRules;
import dev.axeldoussoux.creneau.common.ApiException;
import dev.axeldoussoux.creneau.config.AppProperties;
import dev.axeldoussoux.creneau.room.Room;
import org.springframework.stereotype.Component;

/**
 * Règles métier d'une réservation, sans accès à la base : testables isolément avec une horloge fixe.
 * Le chevauchement entre réservations est vérifié à part, par le service et par la contrainte SQL.
 */
@Component
public class BookingPolicy {

    private final AppProperties.Booking rules;
    private final ZoneId zone;
    private final Clock clock;

    public BookingPolicy(AppProperties properties, Clock clock) {
        this.rules = properties.booking();
        this.zone = properties.zone();
        this.clock = clock;
    }

    public void checkNewBooking(Room room, Instant startsAt, Instant endsAt, int attendees) {
        if (!room.isActive()) {
            throw ApiException.rule("ROOM_INACTIVE", "Cette salle n'est plus réservable.");
        }
        if (!endsAt.isAfter(startsAt)) {
            throw ApiException.rule("INVALID_RANGE", "L'heure de fin doit suivre l'heure de début.");
        }
        Duration duration = Duration.between(startsAt, endsAt);
        if (duration.compareTo(rules.minDuration()) < 0 || duration.compareTo(rules.maxDuration()) > 0) {
            throw ApiException.rule("INVALID_DURATION", "Une réservation dure entre %d min et %d h."
                    .formatted(rules.minDuration().toMinutes(), rules.maxDuration().toHours()));
        }

        ZonedDateTime start = startsAt.atZone(zone);
        ZonedDateTime end = endsAt.atZone(zone);
        if (!isAligned(start) || !isAligned(end)) {
            throw ApiException.rule("SLOT_ALIGNMENT",
                    "Les horaires se calent sur des créneaux de %d minutes.".formatted(rules.slotMinutes()));
        }
        if (!rules.openDays().contains(start.getDayOfWeek())) {
            throw ApiException.rule("CLOSED_DAY", "Les salles ne sont réservables qu'en semaine.");
        }
        LocalTime opening = LocalTime.of(rules.openingHour(), 0);
        LocalTime closing = LocalTime.of(rules.closingHour(), 0);
        boolean sameDay = start.toLocalDate().equals(end.toLocalDate());
        if (!sameDay || start.toLocalTime().isBefore(opening) || end.toLocalTime().isAfter(closing)) {
            throw ApiException.rule("OUTSIDE_OPENING_HOURS",
                    "Les salles sont ouvertes de %dh à %dh.".formatted(rules.openingHour(), rules.closingHour()));
        }

        Instant now = clock.instant();
        if (!startsAt.isAfter(now)) {
            throw ApiException.rule("IN_THE_PAST", "Ce créneau est déjà passé.");
        }
        if (startsAt.isAfter(now.plus(rules.maxAdvance()))) {
            throw ApiException.rule("TOO_FAR_AHEAD",
                    "On réserve au plus %d jours à l'avance.".formatted(rules.maxAdvance().toDays()));
        }
        if (attendees > room.getCapacity()) {
            throw ApiException.rule("OVER_CAPACITY",
                    "Cette salle accueille %d personnes au maximum.".formatted(room.getCapacity()));
        }
    }

    /** Une réservation confirmée s'annule jusqu'à son début. */
    public boolean isCancellable(Booking booking) {
        return booking.getStatus() == BookingStatus.CONFIRMED && booking.getStartsAt().isAfter(clock.instant());
    }

    public void checkCancellable(Booking booking) {
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw ApiException.conflict("ALREADY_CANCELLED", "Cette réservation est déjà annulée.");
        }
        if (!booking.getStartsAt().isAfter(clock.instant())) {
            throw ApiException.rule("ALREADY_STARTED", "Une réunion commencée ne peut plus être annulée.");
        }
    }

    public BookingRules describe() {
        return new BookingRules(zone.getId(), rules.openingHour(), rules.closingHour(), rules.slotMinutes(),
                rules.minDuration().toMinutes(), rules.maxDuration().toMinutes(), rules.maxAdvance().toDays(),
                rules.openDays());
    }

    private boolean isAligned(ZonedDateTime time) {
        return time.getSecond() == 0 && time.getNano() == 0 && time.getMinute() % rules.slotMinutes() == 0;
    }
}
