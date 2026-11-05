CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app_user (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(254) NOT NULL UNIQUE,
    full_name     VARCHAR(80)  NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(16)  NOT NULL CHECK (role IN ('USER', 'ADMIN')),
    created_at    TIMESTAMPTZ  NOT NULL
);

CREATE TABLE room (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(60)  NOT NULL UNIQUE,
    location    VARCHAR(80)  NOT NULL DEFAULT '',
    description VARCHAR(500) NOT NULL DEFAULT '',
    capacity    INTEGER      NOT NULL CHECK (capacity BETWEEN 1 AND 200),
    active      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE room_equipment (
    room_id   BIGINT      NOT NULL REFERENCES room (id) ON DELETE CASCADE,
    equipment VARCHAR(32) NOT NULL,
    PRIMARY KEY (room_id, equipment)
);

CREATE TABLE booking (
    id           BIGSERIAL PRIMARY KEY,
    room_id      BIGINT       NOT NULL REFERENCES room (id),
    user_id      BIGINT       NOT NULL REFERENCES app_user (id),
    title        VARCHAR(120) NOT NULL,
    attendees    INTEGER      NOT NULL CHECK (attendees >= 1),
    starts_at    TIMESTAMPTZ  NOT NULL,
    ends_at      TIMESTAMPTZ  NOT NULL,
    status       VARCHAR(16)  NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at   TIMESTAMPTZ  NOT NULL,
    cancelled_at TIMESTAMPTZ,
    version      BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT booking_time_order CHECK (ends_at > starts_at),
    -- Dernier rempart contre la double réservation, même sous requêtes concurrentes :
    -- deux réservations confirmées d'une même salle ne peuvent pas se chevaucher.
    CONSTRAINT booking_no_overlap EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
    ) WHERE (status = 'CONFIRMED')
);

CREATE INDEX booking_user_starts_idx ON booking (user_id, starts_at);
CREATE INDEX booking_starts_idx ON booking (starts_at);
