package dev.axeldoussoux.creneau.config;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

import dev.axeldoussoux.creneau.booking.Booking;
import dev.axeldoussoux.creneau.booking.BookingRepository;
import dev.axeldoussoux.creneau.room.Equipment;
import dev.axeldoussoux.creneau.room.Room;
import dev.axeldoussoux.creneau.room.RoomRepository;
import dev.axeldoussoux.creneau.user.AppUser;
import dev.axeldoussoux.creneau.user.Role;
import dev.axeldoussoux.creneau.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Jeu de données de démonstration, créé au premier démarrage sur une base vide.
 * Désactivable avec app.demo-data=false (c'est le cas dans les tests).
 */
@Component
@ConditionalOnBooleanProperty("app.demo-data")
class DemoData implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoData.class);

    private final UserRepository users;
    private final RoomRepository rooms;
    private final BookingRepository bookings;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;
    private final Clock clock;

    DemoData(UserRepository users, RoomRepository rooms, BookingRepository bookings, PasswordEncoder passwordEncoder,
            AppProperties properties, Clock clock) {
        this.users = users;
        this.rooms = rooms;
        this.bookings = bookings;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        Instant now = clock.instant();
        users.save(user("admin@creneau.dev", "Camille Admin", "admin1234", Role.ADMIN, now));
        AppUser lea = users.save(user("lea@creneau.dev", "Léa Martin", "demo1234", Role.USER, now));
        AppUser hugo = users.save(user("hugo@creneau.dev", "Hugo Bernard", "demo1234", Role.USER, now));
        AppUser ines = users.save(user("ines@creneau.dev", "Inès Moreau", "demo1234", Role.USER, now));

        List<Room> all = rooms.saveAll(List.of(
                new Room("Fourvière", "Étage 1 · Aile nord", "Petite salle lumineuse pour les points rapides.", 4,
                        EnumSet.of(Equipment.SCREEN, Equipment.WHITEBOARD)),
                new Room("Croix-Rousse", "Étage 1 · Aile sud", "Salle d'équipe avec écran et visioconférence.", 8,
                        EnumSet.of(Equipment.SCREEN, Equipment.VIDEOCONFERENCE, Equipment.WHITEBOARD,
                                Equipment.WHEELCHAIR_ACCESS)),
                new Room("Confluence", "Étage 2", "Salle de réunion principale, idéale pour les comités.", 14,
                        EnumSet.of(Equipment.PROJECTOR, Equipment.VIDEOCONFERENCE, Equipment.SPEAKERPHONE,
                                Equipment.WHEELCHAIR_ACCESS)),
                new Room("Bellecour", "Rez-de-chaussée", "Grand espace modulable pour ateliers et présentations.",
                        30, EnumSet.of(Equipment.PROJECTOR, Equipment.SCREEN, Equipment.SPEAKERPHONE,
                                Equipment.WHITEBOARD, Equipment.WHEELCHAIR_ACCESS)),
                new Room("Part-Dieu", "Étage 3", "Cabine isolée pour les appels et entretiens.", 2,
                        EnumSet.of(Equipment.VIDEOCONFERENCE)),
                new Room("Gerland", "Étage 3", "Salle créative avec murs inscriptibles.", 6,
                        EnumSet.of(Equipment.WHITEBOARD, Equipment.SCREEN))));

        List<LocalDate> days = nextOpenDays(LocalDate.now(clock), 5);
        record Slot(int room, AppUser who, String title, int attendees, String start, String end) {
        }
        List<Slot> pattern = List.of(
                new Slot(1, lea, "Daily produit", 6, "09:30", "09:45"),
                new Slot(2, hugo, "Revue de sprint", 10, "14:00", "15:30"),
                new Slot(0, ines, "Point recrutement", 3, "11:00", "11:30"),
                new Slot(3, lea, "Atelier design system", 18, "10:00", "12:00"),
                new Slot(4, hugo, "Entretien candidat", 2, "16:00", "17:00"));

        List<Booking> seeded = new ArrayList<>();
        for (int day = 0; day < days.size(); day++) {
            for (int i = 0; i < pattern.size(); i++) {
                if ((day + i) % 3 == 2) {
                    continue; // une journée ne ressemble pas à l'autre
                }
                Slot slot = pattern.get(i);
                Instant start = at(days.get(day), slot.start());
                if (start.isBefore(now)) {
                    continue;
                }
                seeded.add(new Booking(all.get(slot.room()), slot.who(), slot.title(), slot.attendees(), start,
                        at(days.get(day), slot.end()), now));
            }
        }
        bookings.saveAll(seeded);
        log.info("Données de démo créées : {} salles, {} réservations. Connexion : admin@creneau.dev / admin1234",
                all.size(), seeded.size());
    }

    private AppUser user(String email, String name, String password, Role role, Instant now) {
        return new AppUser(email, name, passwordEncoder.encode(password), role, now);
    }

    private Instant at(LocalDate day, String time) {
        return day.atTime(LocalTime.parse(time)).atZone(properties.zone()).toInstant();
    }

    private List<LocalDate> nextOpenDays(LocalDate from, int count) {
        List<LocalDate> result = new ArrayList<>();
        EnumSet<DayOfWeek> open = EnumSet.copyOf(properties.booking().openDays());
        for (LocalDate day = from; result.size() < count; day = day.plusDays(1)) {
            if (open.contains(day.getDayOfWeek())) {
                result.add(day);
            }
        }
        return result;
    }
}
