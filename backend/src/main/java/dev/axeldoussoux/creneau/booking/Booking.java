package dev.axeldoussoux.creneau.booking;

import java.time.Instant;

import dev.axeldoussoux.creneau.room.Room;
import dev.axeldoussoux.creneau.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "booking")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private int attendees;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Version
    private long version;

    protected Booking() {
    }

    public Booking(Room room, AppUser user, String title, int attendees, Instant startsAt, Instant endsAt,
            Instant createdAt) {
        this.room = room;
        this.user = user;
        this.title = title.strip();
        this.attendees = attendees;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.status = BookingStatus.CONFIRMED;
        this.createdAt = createdAt;
    }

    void cancel(Instant now) {
        this.status = BookingStatus.CANCELLED;
        this.cancelledAt = now;
    }

    public boolean isOwnedBy(long userId) {
        return user.getId() == userId;
    }

    public Long getId() {
        return id;
    }

    public Room getRoom() {
        return room;
    }

    public AppUser getUser() {
        return user;
    }

    public String getTitle() {
        return title;
    }

    public int getAttendees() {
        return attendees;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }
}
