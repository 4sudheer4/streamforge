package com.streamforge.domain;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record StreamEvent(
    UUID id,
    String sourceId,
    String type,
    Map<String, Object> payload,
    Instant timestamp,
    String fingerprint
) {}