package dev.axeldoussoux.creneau.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.EnumSet;

import dev.axeldoussoux.creneau.common.ApiException;
import dev.axeldoussoux.creneau.config.AppProperties;
import dev.axeldoussoux.creneau.room.Equipment;
import dev.axeldoussoux.creneau.room.Room;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class BookingPolicyTest {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    /** Lundi 7 janvier 2030, 8 h à Paris. */
    private static final Instant NOW = LocalDateTime.of(2030, 1, 7, 8, 0).atZone(PARIS).toInstant();

    private final BookingPolicy policy = new BookingPolicy(properties(), Clock.fixed(NOW, PARIS));
    private final Room room = new Room("Confluence", "Étage 2", "", 10, EnumSet.of(Equipment.PROJECTOR));

    @Test
    void acceptsAValidBooking() {
        assertThatCode(() -> policy.checkNewBooking(room, at("2030-01-07T10:00"), at("2030-01-07T11:30"), 8))
                .doesNotThrowAnyException();
    }

    @Test
    void acceptsABookingEndingExactlyAtClosingTime() {
        assertThatCode(() -> policy.checkNewBooking(room, at("2030-01-08T18:00"), at("2030-01-08T20:00"), 1))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "{0} → {1} : {2}")
    @CsvSource({
            "2030-01-07T11:00, 2030-01-07T10:00, INVALID_RANGE",
            "2030-01-07T10:00, 2030-01-07T10:10, INVALID_DURATION",
            "2030-01-07T09:00, 2030-01-07T13:15, INVALID_DURATION",
            "2030-01-07T10:05, 2030-01-07T11:05, SLOT_ALIGNMENT",
            "2030-01-12T10:00, 2030-01-12T11:00, CLOSED_DAY",
            "2030-01-07T07:30, 2030-01-07T08:30, OUTSIDE_OPENING_HOURS",
            "2030-01-07T19:30, 2030-01-07T20:15, OUTSIDE_OPENING_HOURS",
            "2030-01-07T08:00, 2030-01-07T09:00, IN_THE_PAST",
            "2030-03-11T10:00, 2030-03-11T11:00, TOO_FAR_AHEAD",
    })
    void rejectsBookingsThatBreakARule(String start, String end, String expectedCode) {
        assertThatThrownBy(() -> policy.checkNewBooking(room, at(start), at(end), 2))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.code()).isEqualTo(expectedCode));
    }

    @Test
    void rejectsMoreAttendeesThanSeats() {
        assertThatThrownBy(() -> policy.checkNewBooking(room, at("2030-01-07T10:00"), at("2030-01-07T11:00"), 11))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.code()).isEqualTo("OVER_CAPACITY"));
    }

    @Test
    void rejectsAnArchivedRoom() {
        room.setActive(false);
        assertThatThrownBy(() -> policy.checkNewBooking(room, at("2030-01-07T10:00"), at("2030-01-07T11:00"), 1))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.code()).isEqualTo("ROOM_INACTIVE"));
    }

    private static Instant at(String localDateTime) {
        return LocalDateTime.parse(localDateTime).atZone(PARIS).toInstant();
    }

    private static AppProperties properties() {
        AppProperties.Booking booking = new AppProperties.Booking(8, 20, 15, Duration.ofMinutes(15),
                Duration.ofHours(4), Duration.ofDays(60),
                EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.FRIDAY));
        return new AppProperties(PARIS, false, booking,
                new AppProperties.Jwt("test", Duration.ofHours(1), "unused"));
    }
}
