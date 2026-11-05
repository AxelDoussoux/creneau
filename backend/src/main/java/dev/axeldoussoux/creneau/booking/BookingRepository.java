package dev.axeldoussoux.creneau.booking;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("""
            select count(b) > 0 from Booking b
            where b.room.id = :roomId
              and b.status = :status
              and b.startsAt < :to
              and b.endsAt > :from
            """)
    boolean existsOverlap(@Param("roomId") long roomId, @Param("from") Instant from, @Param("to") Instant to,
            @Param("status") BookingStatus status);

    @Query("""
            select b from Booking b join fetch b.user
            where b.room.id = :roomId
              and b.status = :status
              and b.startsAt < :to
              and b.endsAt > :from
            order by b.startsAt
            """)
    List<Booking> findForRoom(@Param("roomId") long roomId, @Param("from") Instant from, @Param("to") Instant to,
            @Param("status") BookingStatus status);

    @Query("""
            select b from Booking b join fetch b.room join fetch b.user
            where b.user.id = :userId and b.endsAt > :now
            order by b.startsAt
            """)
    List<Booking> findUpcomingForUser(@Param("userId") long userId, @Param("now") Instant now);

    @Query("""
            select b from Booking b join fetch b.room join fetch b.user
            where b.user.id = :userId and b.endsAt <= :now
            order by b.startsAt desc
            """)
    List<Booking> findPastForUser(@Param("userId") long userId, @Param("now") Instant now);

    @Query("""
            select b from Booking b join fetch b.room join fetch b.user
            where b.startsAt < :to and b.endsAt > :from
            order by b.startsAt, b.room.name
            """)
    List<Booking> findAllBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("select b from Booking b join fetch b.room join fetch b.user where b.id = :id")
    Optional<Booking> findDetailed(@Param("id") long id);
}
