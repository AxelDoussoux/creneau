package dev.axeldoussoux.creneau;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import com.jayway.jsonpath.JsonPath;
import dev.axeldoussoux.creneau.user.AppUser;
import dev.axeldoussoux.creneau.user.Role;
import dev.axeldoussoux.creneau.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(properties = "app.demo-data=false")
@AutoConfigureMockMvc
@Import({ TestcontainersConfiguration.class, BookingApiTests.FixedClock.class })
class BookingApiTests {

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedClock {

        /** Lundi 7 janvier 2030, 7 h à Paris : dans le futur, donc les JWT émis restent valides. */
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(LocalDateTime.of(2030, 1, 7, 7, 0).atZone(PARIS).toInstant(), PARIS);
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    UserRepository users;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    Clock clock;

    private String adminToken;
    private String leaToken;
    private String hugoToken;
    private long roomId;

    @BeforeEach
    void setUp() throws Exception {
        jdbc.execute("TRUNCATE booking, room_equipment, room, app_user RESTART IDENTITY CASCADE");
        users.save(new AppUser("admin@test.dev", "Admin", passwordEncoder.encode("admin1234"), Role.ADMIN,
                clock.instant()));
        adminToken = login("admin@test.dev", "admin1234");
        leaToken = register("lea@test.dev", "Léa Martin");
        hugoToken = register("hugo@test.dev", "Hugo Bernard");

        MvcResult room = mvc.perform(json(post("/api/admin/rooms"), adminToken, """
                {"name":"Confluence","location":"Étage 2","description":"","capacity":10,
                 "equipment":["PROJECTOR","VIDEOCONFERENCE"]}"""))
                .andExpect(status().isCreated())
                .andReturn();
        roomId = ((Number) JsonPath.read(room.getResponse().getContentAsString(), "$.id")).longValue();
    }

    @Test
    void rejectsAnonymousCallsAndProtectsAdminRoutes() throws Exception {
        mvc.perform(get("/api/rooms")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/rooms").header("Authorization", bearer(leaToken)))
                .andExpect(status().isForbidden());
        mvc.perform(json(post("/api/auth/login"), null, """
                {"email":"lea@test.dev","password":"wrong-password"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("BAD_CREDENTIALS"));
    }

    @Test
    void booksAFreeSlotThenRefusesAnOverlappingOne() throws Exception {
        book(leaToken, "10:00", "11:00")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roomName").value("Confluence"))
                .andExpect(jsonPath("$.organizer.fullName").value("Léa Martin"))
                .andExpect(jsonPath("$.cancellable").value(true));

        book(hugoToken, "10:30", "11:30")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_TAKEN"));

        // Les intervalles sont semi-ouverts : une réunion peut commencer quand la précédente finit.
        book(hugoToken, "11:00", "12:00").andExpect(status().isCreated());

        mvc.perform(get("/api/rooms/{id}/schedule", roomId).param("date", "2030-01-07")
                        .header("Authorization", bearer(hugoToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].mine").value(false))
                .andExpect(jsonPath("$[1].mine").value(true));
    }

    @Test
    void searchOnlyReturnsRoomsFreeOnTheWholeRange() throws Exception {
        book(leaToken, "14:00", "15:00").andExpect(status().isCreated());

        mvc.perform(get("/api/rooms").header("Authorization", bearer(hugoToken))
                        .param("from", at("14:30").toString()).param("to", at("15:30").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mvc.perform(get("/api/rooms").header("Authorization", bearer(hugoToken))
                        .param("from", at("15:00").toString()).param("to", at("16:00").toString())
                        .param("equipment", "PROJECTOR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void reportsBusinessRuleViolationsAs422WithAStableCode() throws Exception {
        book(leaToken, "10:05", "11:00")
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("SLOT_ALIGNMENT"));

        mvc.perform(json(post("/api/bookings"), leaToken, """
                {"roomId":%d,"title":"","attendees":0,"startsAt":"%s","endsAt":"%s"}"""
                        .formatted(roomId, at("10:00"), at("11:00"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fields.title").exists())
                .andExpect(jsonPath("$.fields.attendees").exists());
    }

    @Test
    void onlyTheOrganizerOrAnAdminCanCancel() throws Exception {
        MvcResult created = book(leaToken, "16:00", "17:00").andExpect(status().isCreated()).andReturn();
        long bookingId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        mvc.perform(post("/api/bookings/{id}/cancel", bookingId).header("Authorization", bearer(hugoToken)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/bookings/{id}/cancel", bookingId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        mvc.perform(post("/api/bookings/{id}/cancel", bookingId).header("Authorization", bearer(leaToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_CANCELLED"));

        // Le créneau libéré est de nouveau réservable.
        book(hugoToken, "16:00", "17:00").andExpect(status().isCreated());
    }

    @Test
    void concurrentRequestsForTheSameSlotYieldExactlyOneBooking() throws Exception {
        int contenders = 8;
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < contenders; i++) {
            tokens.add(register("user" + i + "@test.dev", "Utilisateur " + i));
        }

        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger created = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();
        List<Callable<Void>> attempts = tokens.stream().<Callable<Void>>map(token -> () -> {
            start.await();
            int status = book(token, "09:00", "10:00").andReturn().getResponse().getStatus();
            (status == 201 ? created : conflicts).incrementAndGet();
            assertThat(status).isIn(201, 409);
            return null;
        }).toList();

        try (ExecutorService pool = Executors.newFixedThreadPool(contenders)) {
            List<Future<Void>> results = attempts.stream().map(pool::submit).toList();
            start.countDown();
            for (Future<Void> result : results) {
                result.get();
            }
        }

        assertThat(created).hasValue(1);
        assertThat(conflicts).hasValue(contenders - 1);
        Integer stored = jdbc.queryForObject("SELECT count(*) FROM booking WHERE status = 'CONFIRMED'", Integer.class);
        assertThat(stored).isEqualTo(1);
    }

    private org.springframework.test.web.servlet.ResultActions book(String token, String start, String end)
            throws Exception {
        return mvc.perform(json(post("/api/bookings"), token, """
                {"roomId":%d,"title":"Réunion","attendees":4,"startsAt":"%s","endsAt":"%s"}"""
                .formatted(roomId, at(start), at(end))));
    }

    private String register(String email, String name) throws Exception {
        MvcResult result = mvc.perform(json(post("/api/auth/register"), null, """
                {"email":"%s","fullName":"%s","password":"demo1234"}""".formatted(email, name)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(json(post("/api/auth/login"), null, """
                {"email":"%s","password":"%s"}""".formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String token,
            String body) {
        MockHttpServletRequestBuilder built = request.contentType(MediaType.APPLICATION_JSON).content(body);
        return token == null ? built : built.header("Authorization", bearer(token));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    /** Heure locale à Paris le lundi 7 janvier 2030. */
    private static Instant at(String time) {
        return LocalDateTime.parse("2030-01-07T" + time).atZone(PARIS).toInstant();
    }
}
