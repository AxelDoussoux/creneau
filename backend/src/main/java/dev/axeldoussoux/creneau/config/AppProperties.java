package dev.axeldoussoux.creneau.config;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.ZoneId;
import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(ZoneId zone, boolean demoData, Booking booking, Jwt jwt) {

    /** Règles métier de réservation, exposées telles quelles au front via /api/booking-rules. */
    public record Booking(
            int openingHour,
            int closingHour,
            int slotMinutes,
            Duration minDuration,
            Duration maxDuration,
            Duration maxAdvance,
            Set<DayOfWeek> openDays) {
    }

    public record Jwt(String issuer, Duration ttl, String secret) {
    }
}
