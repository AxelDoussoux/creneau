package dev.axeldoussoux.creneau.room;

import java.time.Instant;
import java.util.Set;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class RoomDtos {

    private RoomDtos() {
    }

    public record RoomResponse(long id, String name, String location, String description, int capacity,
            Set<Equipment> equipment, boolean active) {

        public static RoomResponse of(Room room) {
            return new RoomResponse(room.getId(), room.getName(), room.getLocation(), room.getDescription(),
                    room.getCapacity(), room.getEquipment(), room.isActive());
        }
    }

    public record RoomRequest(
            @NotBlank(message = "Le nom est requis.") @Size(max = 60, message = "60 caractères maximum.") String name,
            @Size(max = 80, message = "80 caractères maximum.") String location,
            @Size(max = 500, message = "500 caractères maximum.") String description,
            @Min(value = 1, message = "Au moins 1 place.") @Max(value = 200, message = "200 places maximum.") int capacity,
            @NotNull Set<Equipment> equipment) {
    }

    public record ActiveRequest(boolean active) {
    }

    /** Créneau occupé dans le planning d'une salle. */
    public record ScheduleSlot(long bookingId, Instant startsAt, Instant endsAt, String title, String organizer,
            boolean mine) {
    }
}
