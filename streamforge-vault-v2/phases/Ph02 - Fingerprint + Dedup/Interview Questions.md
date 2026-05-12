### Phase 2 — FAANG Level Interview Questions

---

#### Warm Up — Expected in any interview

**Q: What is idempotency and how does StreamForge achieve it?**

A: Idempotency means the same operation performed multiple times produces the same result. StreamForge achieves it by fingerprinting event content — same event processed 10 times produces one DB row, not 10. The fingerprint is the idempotency key.

---

**Q: Why SHA-256 over MD5 for fingerprinting?**

A: MD5 has known collision vulnerabilities — two different inputs can produce the same hash. In a dedup system a collision means a legitimate new event gets treated as a duplicate and dropped. SHA-256 has no known collisions. The cost is slightly more computation — irrelevant at event scale.

---

**Q: Why ConcurrentHashMap over Collections.synchronizedMap()?**

A: `synchronizedMap` wraps the entire map in a single lock — every read and write blocks all other threads. `ConcurrentHashMap` uses segment-level locking — only the affected bucket is locked, rest of the map is accessible. Under high concurrency `ConcurrentHashMap` is significantly faster.

---

#### Mid Level — Google / Meta style

**Q: Your dedup engine is running on 5 pods. Walk me through the failure scenario and your fix.**

A: Each pod has its own `ConcurrentHashMap`. Event 1 hits Pod A — cached. Retry hits Pod B — empty cache — cache miss — double processed. Fix is replacing `ConcurrentHashMap` with Redis — one shared cache all pods read and write. Redis also survives pod restarts — in-memory cache doesn't.

---

**Q: What happens to your dedup cache during a rolling deployment?**

A: Pod restarts during deployment — entire `ConcurrentHashMap` is lost. Any event that was cached but not yet expired is now vulnerable to reprocessing if a retry arrives after restart. Redis fixes this — cache survives restarts. Alternative is sticky sessions — route same sourceId to same pod — but that's fragile.

---

**Q: How would you handle a thundering herd — 10,000 identical events arriving simultaneously?**

A: First event through causes a cache miss, hits DB, stores in cache. Remaining 9,999 should hit cache. Problem is race condition — if all 10,000 arrive before the first one stores its result, all 10,000 get cache miss simultaneously. Fix is double-checked locking or Redis `SET NX` — atomic "set if not exists" — only one thread wins the miss, rest wait and hit cache.

---

**Q: Your `dedup_ratio` suddenly spikes to 0.95. What do you do?**

A: 95% duplicate traffic means upstream is retrying aggressively. Investigation steps:

```
1. Check which sourceId is generating duplicates — add sourceId tag to dedup_hits counter
2. Check retry config on upstream client — likely misconfigured backoff
3. Check if event processing is slow — slow processing triggers client timeouts → retries
4. Check DLQ — if events are failing they'll be retried forever
```

---

#### Hard — Staff Engineer Level

**Q: Design the fingerprinting system to handle payload fields that legitimately change between retries — like a `retryCount` field.**

A: Two options. First — exclude known volatile fields from fingerprint computation using a configurable ignore list:

java

```java
Set<String> ignoreFields = Set.of("retryCount", "attemptNumber", "clientTimestamp");
sortedPayload.keySet().removeAll(ignoreFields);
```

Second — define a canonical payload schema per event type — only hash the business-critical fields, ignore metadata fields. More robust but requires schema registry. I'd start with the ignore list and evolve to schema registry as event types grow.

---

**Q: How would you make the TTL dynamic — different TTLs for different event types?**

A: Replace single TTL with a `Map<String, Duration>` keyed by event type:

java

```java
Map<String, Duration> ttlByType = Map.of(
    "payment.completed", Duration.ofHours(2),  // payments need longer dedup window
    "user.click",        Duration.ofMinutes(5), // clicks are low risk
    "default",           Duration.ofMinutes(30)
);
```

Lookup by `event.type()` at cache time, fall back to default. Load from config so ops team can tune without deployment.

---

**Q: How would you scale the dedup system to 1 million events per second?**

A: Current bottleneck chain:

```
1. Single Redis instance      → shard by sourceId hash
2. SHA-256 per event          → cache fingerprints client-side for known retry patterns
3. Synchronous DB write       → async write via Kafka — Phase 5 fixes this
4. Single Kafka topic         → partition by sourceId — parallel consumption
5. JVM GC pressure            → short-lived objects (EventResult, StreamEvent) 
                                 → use object pooling or reduce allocation
```

At 1M/sec the architecture is the same — just every component horizontally scaled. The key insight is dedup check (Redis) must be faster than event processing (DB write) — otherwise the cache provides no benefit.

---

**Q: A compliance team says you must guarantee exactly-once processing — not just dedup on best effort. How do you change the design?**

A: Best-effort dedup has the race condition gap. Exactly-once requires:

```
1. Distributed lock on fingerprint before processing
   → Redis SETNX with expiry — only one pod processes per fingerprint
   
2. Transactional outbox pattern
   → DB write + Kafka publish in same transaction
   → no event lost between DB save and Kafka publish

3. Idempotent consumers downstream
   → even if duplicate slips through, downstream handles it
   → defense in depth

4. Two-phase commit or saga pattern
   → for cross-service exactly-once guarantees
```

True exactly-once is expensive. In practice you combine dedup + idempotent consumers — close enough for most financial systems.

---

#### The One Question That Separates Candidates

**Q: If you had to throw away everything you built in Phase 2 and redesign it, what would you do differently?**

Strong answer: _"I'd separate the fingerprint store from the dedup logic entirely. Right now `DeduplicationEngine` owns both the cache and the decision logic. At scale these have different scaling needs — the cache needs to be distributed, the decision logic needs to be fast and stateless. I'd extract the cache into a dedicated `FingerprintStore` interface with Redis implementation, keeping `DeduplicationEngine` purely stateless. I'd also add a bloom filter as a first-pass check before hitting Redis — bloom filters are probabilistic but O(1) and in-memory, catching 99% of duplicates before Redis is even consulted."_

---

### Phase 2 Complete ✅

```
What you built:
    FingerprintGenerator     → SHA-256 content identity
    DeduplicationEntry       → TTL-aware cache record
    EventResult              → typed response object
    DeduplicationEngine      → ConcurrentHashMap dedup with metrics
    EventIngestionService    → orchestrator with processor pattern
    EventController          → HTTP layer with 200/208
    Micrometer metrics       → dedup_hits, dedup_misses, dedup_ratio

What you learned:
    Stateless vs stateful design
    Constructor injection + Spring IoC
    Operation vs data objects
    Single responsibility principle
    Distributed cache limitations
    Counter vs gauge metrics
    Idempotency at HTTP scale

LC connection:
    LC 217 Contains Duplicate → ConcurrentHashMap dedup
    LC 1 Two Sum              → fingerprint→result HashMap lookup
```