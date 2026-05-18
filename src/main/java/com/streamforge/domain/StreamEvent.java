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

/*
"id"         → UUID id
"sourceId"   → String sourceId       "stripe-prod"
"type"       → String type           "payment.completed"
"payload"    → Map<String, Object>   {"amount": 9900, "currency": "USD", ...}
"timestamp"  → Instant timestamp     "2024-01-15T10:03:47Z"
"fingerprint"→ String fingerprint    null on arrival, FingerprintGenerator fills this 
*/