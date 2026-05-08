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

    // constructor, getters
}