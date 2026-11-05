package dev.axeldoussoux.creneau.room;

import java.time.Instant;
import java.util.List;

import dev.axeldoussoux.creneau.booking.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findAllByOrderByNameAsc();

    List<Room> findByActiveTrueAndCapacityGreaterThanEqualOrderByCapacityAscNameAsc(int capacity);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    /** Salles actives assez grandes et sans aucune réservation confirmée qui chevauche [from, to). */
    @Query("""
            select r from Room r
            where r.active = true
              and r.capacity >= :capacity
              and not exists (
                  select b.id from Booking b
                  where b.room = r
                    and b.status = :status
                    and b.startsAt < :to
                    and b.endsAt > :from)
            order by r.capacity, r.name
            """)
    List<Room> findFree(@Param("capacity") int capacity, @Param("from") Instant from, @Param("to") Instant to,
            @Param("status") BookingStatus status);
}
