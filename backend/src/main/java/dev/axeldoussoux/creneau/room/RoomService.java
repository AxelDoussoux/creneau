package dev.axeldoussoux.creneau.room;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import dev.axeldoussoux.creneau.booking.BookingStatus;
import dev.axeldoussoux.creneau.common.ApiException;
import dev.axeldoussoux.creneau.room.RoomDtos.RoomRequest;
import dev.axeldoussoux.creneau.room.RoomDtos.RoomResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomService {

    private final RoomRepository rooms;

    RoomService(RoomRepository rooms) {
        this.rooms = rooms;
    }

    /**
     * Recherche des salles réservables. Avec une plage horaire, seules les salles libres
     * sur toute la plage sont renvoyées.
     */
    @Transactional(readOnly = true)
    public List<RoomResponse> search(int minCapacity, Set<Equipment> equipment, Instant from, Instant to) {
        if ((from == null) != (to == null)) {
            throw ApiException.rule("INVALID_RANGE", "Indiquez à la fois le début et la fin de la plage.");
        }
        if (from != null && !to.isAfter(from)) {
            throw ApiException.rule("INVALID_RANGE", "L'heure de fin doit suivre l'heure de début.");
        }
        int capacity = Math.max(1, minCapacity);
        List<Room> candidates = from == null
                ? rooms.findByActiveTrueAndCapacityGreaterThanEqualOrderByCapacityAscNameAsc(capacity)
                : rooms.findFree(capacity, from, to, BookingStatus.CONFIRMED);
        return candidates.stream()
                .filter(room -> room.hasAll(equipment))
                .map(RoomResponse::of)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse get(long id) {
        return RoomResponse.of(require(id));
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listAll() {
        return rooms.findAllByOrderByNameAsc().stream().map(RoomResponse::of).toList();
    }

    @Transactional
    public RoomResponse create(RoomRequest request) {
        if (rooms.existsByNameIgnoreCase(request.name().strip())) {
            throw ApiException.conflict("ROOM_NAME_TAKEN", "Une salle porte déjà ce nom.");
        }
        Room room = new Room(request.name(), request.location(), request.description(), request.capacity(),
                request.equipment());
        return RoomResponse.of(rooms.save(room));
    }

    @Transactional
    public RoomResponse update(long id, RoomRequest request) {
        Room room = require(id);
        if (rooms.existsByNameIgnoreCaseAndIdNot(request.name().strip(), id)) {
            throw ApiException.conflict("ROOM_NAME_TAKEN", "Une salle porte déjà ce nom.");
        }
        room.update(request.name(), request.location(), request.description(), request.capacity(),
                request.equipment());
        return RoomResponse.of(room);
    }

    /** Une salle n'est jamais supprimée : on l'archive pour conserver l'historique des réservations. */
    @Transactional
    public RoomResponse setActive(long id, boolean active) {
        Room room = require(id);
        room.setActive(active);
        return RoomResponse.of(room);
    }

    Room require(long id) {
        return rooms.findById(id).orElseThrow(() -> ApiException.notFound("Salle introuvable."));
    }
}
