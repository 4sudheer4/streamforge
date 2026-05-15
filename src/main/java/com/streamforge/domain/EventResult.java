// src/main/java/com/streamforge/domain/EventResult.java
package com.streamforge.domain;

import java.util.UUID;

public record EventResult(
        UUID eventId,          // the persisted event's ID
        String status,         // "PROCESSED" or "DUPLICATE"
        String fingerprint,    // the SHA-256 hash from Task 1
        boolean deduplicated   // quick boolean flag for callers
) {}
/* 
public record StreamEvent(
    UUID id,
    String sourceId,
    String type,
    Map<String, Object> payload,
    Instant timestamp,
    String fingerprint
) {}
    */
