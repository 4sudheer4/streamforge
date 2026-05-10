package com.streamforge.infra;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "stream_events")
public class StreamEventEntity {

    @Id
    private UUID id;
    private String sourceId;
    private String type;

    @Column(columnDefinition = "jsonb")
    @Convert(converter = MapToJsonConverter.class)
    private Map<String, Object> payload;

    private Instant timestamp;
    private String fingerprint;

    // JPA requires a no-arg constructor
    public StreamEventEntity() {}

    // The constructor EventIngestionService is calling
    public StreamEventEntity(UUID id, String sourceId, String type,
                              Map<String, Object> payload, Instant timestamp,
                              String fingerprint) {
        this.id = id;
        this.sourceId = sourceId;
        this.type = type;
        this.payload = payload;
        this.timestamp = timestamp;
        this.fingerprint = fingerprint;
    }

    // Getters
    public UUID getId() { return id; }
    public String getSourceId() { return sourceId; }
    public String getType() { return type; }
    public Map<String, Object> getPayload() { return payload; }
    public Instant getTimestamp() { return timestamp; }
    public String getFingerprint() { return fingerprint; }
}