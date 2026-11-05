package dev.axeldoussoux.creneau.booking;

import java.time.DayOfWeek;
import java.time.Instant;
import java.util.Set;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class BookingDtos {

    private BookingDtos() {
    }

    public record CreateBookingRequest(
            @NotNull(message = "La salle est requise.") Long roomId,
            @NotBlank(message = "Donnez un titre à la réunion.") @Size(max = 120, message = "120 caractères maximum.") String title,
            @Min(value = 1, message = "Au moins 1 participant.") int attendees,
            @NotNull(message = "Le début est requis.") Instant startsAt,
            @NotNull(message = "La fin est requise.") Instant endsAt) {
    }

    public record Organizer(long id, String fullName) {
    }

    public record BookingResponse(long id, long roomId, String roomName, String roomLocation, String title,
            int attendees, Instant startsAt, Instant endsAt, BookingStatus status, Organizer organizer,
            Instant createdAt, boolean cancellable) {

        static BookingResponse of(Booking booking, boolean cancellable) {
            return new BookingResponse(booking.getId(), booking.getRoom().getId(), booking.getRoom().getName(),
                    booking.getRoom().getLocation(), booking.getTitle(), booking.getAttendees(),
                    booking.getStartsAt(), booking.getEndsAt(), booking.getStatus(),
                    new Organizer(booking.getUser().getId(), booking.getUser().getFullName()),
                    booking.getCreatedAt(), cancellable);
        }
    }

    /** Règles de réservation publiées au front, pour qu'il construise des formulaires cohérents. */
    public record BookingRules(String zone, int openingHour, int closingHour, int slotMinutes, long minDurationMinutes,
            long maxDurationMinutes, long maxAdvanceDays, Set<DayOfWeek> openDays) {
    }
}
