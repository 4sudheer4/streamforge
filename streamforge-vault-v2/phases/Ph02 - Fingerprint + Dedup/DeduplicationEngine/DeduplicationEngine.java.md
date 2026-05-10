---
tags:
  - code
  - interview
  - java
  - ph02
  - task3
phase:
date: 2026-05-07
---

# `DeduplicationEngine` / `DeduplicationEngine`

## 💡 What It Is
This will make sure if StreamEvent has a cache hit or miss

## 📝 How It Works
This is where everything from Task 1 and Task 2 comes together. The engine does exactly one thing: **given an event, either return a cached result or process it fresh and cache the result.**

The core method `deduplicateOrProcess` takes two things — the event, and a `processor` function. That processor function is intentionally injected from outside rather than hardcoded. Why? Because the engine shouldn't care _what_ processing means — that's the ingestion service's job. The engine only cares about _whether_ to process. This is the **Single Responsibility Principle** and interviewers love seeing it.

**Why `ConcurrentHashMap`?** Multiple HTTP threads will hit this simultaneously. A regular `HashMap` would cause race conditions — two threads could both get a cache miss, both process the same event, both store results. `ConcurrentHashMap` handles concurrent reads and writes safely without you managing locks manually.

**Why `Function<StreamEvent, EventResult>`?** This makes the engine testable in isolation. In tests you can pass a simple lambda like `event -> mockResult` without needing a real database. In production you pass the actual ingestion logic. Same engine, different processor.

## 🔍 Code/Logic

java

```java
// src/main/java/com/streamforge/engine/DeduplicationEngine.java

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
            @Value("${streamforge.dedup.ttl-minutes:30}") int ttlMinutes
    ) {
        this.fingerprintGenerator = fingerprintGenerator;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }
```
for the above refer [[Constructors Springboot Task 3]]

```java

    /**
     * The core dedup logic:
     * 1. Generate fingerprint from event
     * 2. Check cache — hit? return cached result as DUPLICATE
     * 3. Miss? run processor → store result → return as PROCESSED
     */
     //This function will take streamevent as input and returns eventtype
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
        EventResult result = processor.apply(event);

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
```

[[ConcurrentHashMap -removeIf]]  has a great explanation.

---
## 🤔 Why This Design
### DeduplicationEngine — Summary

**What it does:** Sits between the HTTP endpoint and the database. Every incoming event gets fingerprinted and checked against an in-memory map. Cache hit → return DUPLICATE, skip DB. Cache miss → process, store, return PROCESSED.

---

**Why this design:**

- `ConcurrentHashMap` — multiple HTTP threads hit this simultaneously, regular HashMap would cause race conditions
- `Function<StreamEvent, EventResult>` — engine doesn't know or care about DB logic, caller injects it. Single responsibility.
- `@Value` TTL — configurable per environment, no code changes needed
- `evictExpired()` — proactive cleanup prevents memory leak

**Tradeoff:**
✅O(1) lookup — HashMap get is instant✅Zero DB calls on duplicates❌In-memory only — doesn't survive app restart❌Per-instance — 3 pods running means 3 separate caches. Pod A caches Event 1, Event 2 lands on Pod B → cache miss → double processed
## ⚠️ Gotcha
- Expiry check must come AFTER null check — `existing != null && !existing.isExpired()` — reverse order crashes
- TreeMap in FingerprintGenerator is critical — without it same payload different key order = different fingerprint = dedup miss
- The per-instance problem is exactly why Phase 4 moves this to Redis — one shared cache across all pods

## 🔗 Interview prep
- **The FAANG answer if asked about this system:** _"Current implementation is single-node. The known limitation is cache inconsistency across pod replicas. **"what happens when you scale this to multiple instances?"**

 If you say **"this is single-node by design, Phase 4 moves it to Redis which gives us a shared cache across all pods"** — that signals you understand distributed systems tradeoffs.

It's not a current problem. It's a known limitation you're aware of and have a plan for. That awareness is what separates a mid-level answer from a senior-level answer.Phase 4 addresses this by replacing ConcurrentHashMap with Redis, making the cache distributed and consistent."
