# Gotchas Master List

> One-liner per gotcha. Add here the moment it happens — link to the full note for details.
> Organized by category so you can scan fast.

---

## ☕ Java / Spring

| Gotcha | Phase |
|--------|-------|
| `@EnableScheduling` required or `@Scheduled` silently does nothing | [[Ph04 - Event Ingestion + Metrics]] |
| `/actuator/prometheus` not exposed by default — add to `application.yml` | [[Ph04 - Event Ingestion + Metrics]] |
| `PriorityQueue` is not thread-safe — rebuild on read or synchronize | [[Ph03 - Top-K Tracker]] |
| JPA lazy loading outside `@Transactional` = `LazyInitializationException` | [[Ph08 - Stack + Expression Engine]] |
| `@Transactional` on private methods does nothing — Spring AOP can't proxy them | [[Ph08 - Stack + Expression Engine]] |
| `synchronized` pins Java 21 virtual threads to carrier — use `ReentrantLock` | [[Ph11 - Priority Scheduler + Heaps]] |
| `ConcurrentHashMap.get()` + `put()` is NOT atomic — use `compute()` | [[Ph03 - Top-K Tracker]] |

---

## 🔴 Redis

| Gotcha | Phase |
|--------|-------|
| 3 Redis commands from Java are NOT atomic — use Lua script | [[Ph06 - Redis Rate Limiter]] |
| ZADD score must be milliseconds not seconds — same-second requests collapse | [[Ph06 - Redis Rate Limiter]] |
| Lua scripts are cached by SHA — `SCRIPT FLUSH` on Redis restart loses them | [[Ph06 - Redis Rate Limiter]] |
| `OncePerRequestFilter` order matters — rate limiter must run before auth filter | [[Ph06 - Redis Rate Limiter]] |

---

## 📨 Kafka

| Gotcha | Phase |
|--------|-------|
| `depends_on` ≠ service ready — use healthcheck `condition: service_healthy` | [[Ph02 - Docker + Health]] |
| Idempotent producer requires `acks=all` + `retries>0` + `max.in.flight<=5` — all coupled | [[Ph07 - Kafka Producer + Spike Detector]] |
| `DeadLetterPublishingRecoverer` defaults to `{topic}.DLT` not your named topic | [[Ph07 - Kafka Producer + Spike Detector]] |
| `sourceId` as key → hot partitions if one source dominates traffic | [[Ph07 - Kafka Producer + Spike Detector]] |
| `@KafkaListener` with `concurrency>1` → multiple threads sharing your bean | [[Ph07 - Kafka Producer + Spike Detector]] |

---

## 🗄️ Database

| Gotcha | Phase |
|--------|-------|
| `DESC NULLS LAST` must be explicit — PostgreSQL defaults nulls first on DESC | [[Ph09 - Binary Search + Capacity]] |
| `EXPLAIN ANALYZE` actually runs the query — wrap writes in a transaction | [[Ph09 - Binary Search + Capacity]] |
| Index type mismatch (TIMESTAMP vs TIMESTAMPTZ) causes seq scan instead of index scan | [[Ph09 - Binary Search + Capacity]] |
| Large `OFFSET` pagination is slow — use keyset pagination for time-series | [[Ph09 - Binary Search + Capacity]] |
| Self-referencing FK insert order matters — child before parent = FK violation | [[Ph10 - Source Hierarchy + Trees]] |
| Flyway checksums are immutable — never edit applied migrations | [[Ph14 - Deploy + Benchmarks]] |
| N+1 query from `@OneToMany` lazy loading — use `JOIN FETCH` or `@EntityGraph` | [[Ph10 - Source Hierarchy + Trees]] |

---

## 🐳 Docker / DevOps

| Gotcha | Phase |
|--------|-------|
| Distroless has no shell — use `:debug` tag for `docker exec` troubleshooting | [[Ph14 - Deploy + Benchmarks]] |
| `COPY --chown=65532:65532` required in distroless — nonroot UID 65532 | [[Ph14 - Deploy + Benchmarks]] |
| GitHub Actions `secrets.*` ≠ GCP Secret Manager — two different secret stores | [[Ph14 - Deploy + Benchmarks]] |
| Cloud Run `min-instances=0` causes cold starts — set to 1 if P99 matters | [[Ph14 - Deploy + Benchmarks]] |

---

## 🧮 Algorithms

| Gotcha | Phase |
|--------|-------|
| Knapsack inner loop MUST be descending — ascending = unbounded (items reused) | [[Ph12 - Dependency Graph]] |
| Edit distance backtrack direction — wrong direction = patch applies backwards | [[Ph12 - Dependency Graph]] |
| LFU `minFreq` must reset to 1 on every new key insert | [[Ph13 - Intervals + LRU + Trie]] |
| LRU without sentinel nodes = null pointer edge cases everywhere | [[Ph13 - Intervals + LRU + Trie]] |
| Monotonic deque: pop `<=` not `<` from back — equal values are stale | [[Ph07 - Kafka Producer + Spike Detector]] |
| Kahn's topo sort: `result.size() < totalNodes` = cycle exists | [[Ph12 - Dependency Graph]] |
| Three-color DFS: initialize ALL nodes to WHITE before starting | [[Ph12 - Dependency Graph]] |

---

*Keep this ruthlessly up to date. Every hour you spend debugging is a one-liner here.*
