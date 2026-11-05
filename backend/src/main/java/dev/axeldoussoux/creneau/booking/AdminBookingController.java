package dev.axeldoussoux.creneau.booking;

import java.time.LocalDate;
import java.util.List;

import dev.axeldoussoux.creneau.booking.BookingDtos.BookingResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Administration")
@RestController
@RequestMapping("/api/admin/bookings")
class AdminBookingController {

    private final BookingService bookings;

    AdminBookingController(BookingService bookings) {
        this.bookings = bookings;
    }

    @Operation(summary = "Toutes les réservations entre deux dates incluses")
    @GetMapping
    List<BookingResponse> between(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return bookings.between(from, to);
    }
}
