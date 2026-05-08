// src/main/java/com/streamforge/engine/DeduplicationEngine.java
package com.streamforge.engine;

import com.streamforge.domain.EventResult;
import com.streamforge.domain.StreamEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

@Slf4j
@Component
public class DeduplicationEngine {

    private final ConcurrentHashMap<String, DeduplicationEntry> cache = new ConcurrentHashMap<>();
    private final FingerprintGenerator fingerprintGenerator;
    private final Duration ttl;

    public DeduplicationEngine(
            FingerprintGenerator fingerprintGenerator,
            // WHY @Value? Makes TTL configurable per environment.
            // Dev might use 5 min, prod uses 30 min — no code change needed.
            @Value("${streamforge.dedup.ttl-minutes:30}") int ttlMinutes //fetching it from application.yml
    ) {
        this.fingerprintGenerator = fingerprintGenerator;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    /**
     * The core dedup logic:
     * 1. Generate fingerprint from event
     * 2. Check cache — hit? return cached result as DUPLICATE
     * 3. Miss? run processor → store result → return as PROCESSED
     */
    public EventResult deduplicateOrProcess(
            StreamEvent event,
            Function<StreamEvent, EventResult> processor  // injected processing logic
    ) {
        // Task 1 in action — generate the SHA-256 fingerprint
        String fingerprint = fingerprintGenerator.generate(event);

        // Check cache
        DeduplicationEntry existing = cache.get(fingerprint);

        if (existing != null && !existing.isExpired()) {
            // CACHE HIT — same fingerprint, still within TTL
            log.debug("Dedup HIT fingerprint={}", fingerprint);

            // Return the original eventId but flip status to DUPLICATE
            // WHY return original eventId? Caller can trace back to the first occurrence.
            return new EventResult(
                    existing.result().eventId(),
                    "DUPLICATE",
                    fingerprint,
                    true
            );
        }

        // CACHE MISS — process the event fresh
        log.debug("Dedup MISS fingerprint={}", fingerprint);
        EventResult result = processor.apply(event); //run whatever logic caller passed in, if cache is missed.

        // Store in cache with TTL baked in at creation time
        Instant now = Instant.now();
        cache.put(fingerprint, new DeduplicationEntry(
                fingerprint,
                result,
                now,
                now.plus(ttl)   // expiresAt = now + 30 min
        ));

        return result;
    }

    // Used by Micrometer gauge in Task 4
    public int cacheSize() {
        return cache.size();
    }

    // Called by @Scheduled eviction job — also Task 4
    public void evictExpired() {
        int before = cache.size();
        cache.entrySet().removeIf(e -> e.getValue().isExpired());
        int evicted = before - cache.size();
        if (evicted > 0) {
            log.info("Evicted {} expired dedup entries", evicted);
        }
    }
}