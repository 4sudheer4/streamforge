-- Day 2: will be filled with Docker Compose task
CREATE TABLE stream_events (
    id          UUID PRIMARY KEY,
    source_id   VARCHAR(255) NOT NULL,
    type        VARCHAR(255) NOT NULL,
    payload     JSONB,
    timestamp   TIMESTAMPTZ NOT NULL,
    fingerprint VARCHAR(255) NOT NULL
);