package dev.axeldoussoux.creneau.room;

import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import dev.axeldoussoux.creneau.booking.BookingService;
import dev.axeldoussoux.creneau.common.CurrentUser;
import dev.axeldoussoux.creneau.room.RoomDtos.RoomResponse;
import dev.axeldoussoux.creneau.room.RoomDtos.ScheduleSlot;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Salles")
@RestController
@RequestMapping("/api/rooms")
class RoomController {

    private final RoomService rooms;
    private final BookingService bookings;

    RoomController(RoomService rooms, BookingService bookings) {
        this.rooms = rooms;
        this.bookings = bookings;
    }

    @Operation(summary = "Rechercher des salles, libres sur une plage si from/to sont fournis")
    @GetMapping
    List<RoomResponse> search(
            @RequestParam(defaultValue = "1") int capacity,
            @RequestParam(required = false) Set<Equipment> equipment,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        Set<Equipment> required = equipment == null || equipment.isEmpty()
                ? EnumSet.noneOf(Equipment.class)
                : EnumSet.copyOf(equipment);
        return rooms.search(capacity, required, from, to);
    }

    @GetMapping("/{id}")
    RoomResponse get(@PathVariable long id) {
        return rooms.get(id);
    }

    @Operation(summary = "Créneaux occupés d'une salle pour une journée")
    @GetMapping("/{id}/schedule")
    List<ScheduleSlot> schedule(@PathVariable long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication authentication) {
        return bookings.schedule(id, date, CurrentUser.of(authentication));
    }
}
