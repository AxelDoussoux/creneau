package dev.axeldoussoux.creneau.booking;

import java.util.List;

import dev.axeldoussoux.creneau.booking.BookingDtos.BookingResponse;
import dev.axeldoussoux.creneau.booking.BookingDtos.BookingRules;
import dev.axeldoussoux.creneau.booking.BookingDtos.CreateBookingRequest;
import dev.axeldoussoux.creneau.common.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Réservations")
@RestController
@RequestMapping("/api")
class BookingController {

    private final BookingService bookings;
    private final BookingPolicy policy;

    BookingController(BookingService bookings, BookingPolicy policy) {
        this.bookings = bookings;
        this.policy = policy;
    }

    @Operation(summary = "Règles de réservation (horaires, pas, durées)")
    @GetMapping("/booking-rules")
    BookingRules rules() {
        return policy.describe();
    }

    @Operation(summary = "Mes réservations à venir, ou passées avec past=true")
    @GetMapping("/bookings/mine")
    List<BookingResponse> mine(@RequestParam(defaultValue = "false") boolean past, Authentication authentication) {
        return bookings.mine(CurrentUser.of(authentication), past);
    }

    @Operation(summary = "Réserver une salle. 409 si le créneau est déjà pris")
    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    BookingResponse create(@Valid @RequestBody CreateBookingRequest request, Authentication authentication) {
        return bookings.create(CurrentUser.of(authentication), request);
    }

    @Operation(summary = "Annuler une réservation (organisateur ou administrateur)")
    @PostMapping("/bookings/{id}/cancel")
    BookingResponse cancel(@PathVariable long id, Authentication authentication) {
        return bookings.cancel(CurrentUser.of(authentication), id);
    }
}
