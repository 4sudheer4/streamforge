// src/main/java/com/streamforge/engine/DeduplicationEngine.java
package com.streamforge.engine;

import com.streamforge.domain.EventResult;
import com.streamforge.domain.StreamEvent;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;

@Slf4j
@Component
public class DeduplicationEngine {

    private final ConcurrentHashMap<String, DeduplicationEntry> cache = new ConcurrentHashMap<>();
    private final FingerprintGenerator fingerprintGenerator;
    private final Duration ttl;
    // Micrometer counters
    private final Counter hitCounter;
    private final Counter missCounter;

    public DeduplicationEngine(
            FingerprintGenerator fingerprintGenerator,
            // WHY @Value? Makes TTL configurable per environment.
            // Dev might use 5 min, prod uses 30 min — no code change needed.
            @Value("${streamforge.dedup.ttl-minutes:30}") int ttlMinutes, //fetching it from application.yml
            MeterRegistry meterRegistry   // Spring auto-injects this — Micrometer's operation tool
    ) {
        this.fingerprintGenerator = fingerprintGenerator;
        this.ttl = Duration.ofMinutes(ttlMinutes);
        // register counters with Prometheus
        this.hitCounter = meterRegistry.counter("dedup_hits");
        this.missCounter = meterRegistry.counter("dedup_misses");
        // gauge reads cache size live — no manual increment needed
        // WHY lambda? Gauge needs to READ the value at scrape time, not store it
        // so you pass a function that returns current value when Prometheus asks
        Gauge.builder("dedup_cache_size", cache, ConcurrentHashMap::size)
                .description("Current number of entries in dedup cache")
                .register(meterRegistry);

        // dedup_ratio gauge — computed from both counters
        Gauge.builder("dedup_ratio", this, DeduplicationEngine::calculateRatio)
                .description("Ratio of duplicate events to total events")
                .register(meterRegistry);
    }

    /**
     * The core dedup logic:
     * 1. Generate fingerprint from event
     * 2. Check cache — hit? return cached result as DUPLICATE
     * 3. Miss? run processor → store result → return as PROCESSED
     */
    //takes streamevent and return eventresult with fingerprint. check datastructures for more clarity.
    public EventResult deduplicateOrProcess(
            StreamEvent event,
            Function<StreamEvent, EventResult> processor  // injected processing logic
    ) {
        // Task 1 in action — generate the SHA-256 fingerprint
        String fingerprint = fingerprintGenerator.generate(event);

        StreamEvent eventWithFingerprint = new StreamEvent(
            event.id(),
            event.sourceId(),
            event.type(),
            event.payload(),
            event.timestamp(),
            fingerprint
        );

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

        missCounter.increment();      // new event — increment misses
        // CACHE MISS — process the event fresh
        log.debug("Dedup MISS fingerprint={}", fingerprint);
        EventResult result = processor.apply(eventWithFingerprint); //run whatever logic caller passed in, if cache is missed.

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
    // called by dedup_ratio gauge at every Prometheus scrape
    private double calculateRatio() {
        double hits = hitCounter.count();
        double misses = missCounter.count();
        double total = hits + misses;
        return total == 0 ? 0.0 : hits / total;
        // WHY divide by zero check? App just started — no events yet
        // 0/0 = NaN — Prometheus can't handle NaN, returns 0 instead
    }

    // Used by Micrometer gauge in Task 4
    public int cacheSize() {
        return cache.size();
    }

    @Scheduled(fixedDelay = 60_000) // runs every 60 seconds after last run completes
    public void evictExpired() {
        int before = cache.size();
        cache.entrySet().removeIf(e -> e.getValue().isExpired());
        int evicted = before - cache.size();
        if (evicted > 0) {
            log.info("Evicted {} expired dedup entries", evicted);
        }
    }
    
}