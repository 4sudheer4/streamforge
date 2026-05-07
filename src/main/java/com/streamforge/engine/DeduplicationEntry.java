package com.streamforge.engine;

import com.streamforge.domain.EventResult;
import java.time.Instant;

public record DeduplicationEntry(
        String fingerprint,
        EventResult result,    // the full result stored at cache time
        Instant createdAt,
        Instant expiresAt      // createdAt + TTL, computed once at creation
) {
    // WHY this helper? The engine shouldn't repeat this logic everywhere.
    // One place checks expiry — one place to change if logic evolves.
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}