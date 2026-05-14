**What we built:**

```
TopKEventTracker        →  counts event types, returns top K ranked
AnalyticsController     →  GET /api/v1/analytics/top-events?k=10
GET /api/v1/events/{id} →  fetch single event by primary key
Integration tests       →  50 events, top-K ranking, dedup 208
Grafana dashboard       →  dedup_ratio, hits vs misses, cache size
```

---

**The Algorithm — LC #347 in production:**

```
Step 1  count frequencies    →  ConcurrentHashMap<String, AtomicLong>
Step 2  build min-heap       →  PriorityQueue size K, compare by count ascending
Step 3  iterate map          →  offer each entry, if size > k → poll()
Step 4  copy + sort          →  new ArrayList(heap), sort descending
Step 5  build result         →  rank, type, count, pct
```

---

**Complexity:**

```
record()    →  O(1)        hash lookup + atomic increment
getTopK()   →  O(n log k)  n entries, log k per heap op
             vs O(n log n) if you sorted everything
```

---

**Key design decisions and why:**

```
ConcurrentHashMap     →  stripe locking, threads on different keys never block
                         HashMap corrupts under concurrent writes

AtomicLong            →  CAS — one CPU instruction, no lost counts
                         plain long: read→modify→write = 3 steps, interleave possible

computeIfAbsent       →  atomic check+insert
                         containsKey+put = check-then-act race condition

min-heap not max-heap →  weakest candidate always at top, evicted in O(log k)
                         max-heap requires draining all N elements

Long.compare(b,a)     →  descending, safe from overflow
                         subtraction overflows for long values

local heap            →  rebuilt per call, k varies (?k=5 vs ?k=10)
                         counts map is class field — persists forever

eventual consistency  →  record() runs concurrently during getTopK()
                         no lock on map — analytics can be slightly stale
                         ingestion never blocks — production tradeoff
```

---

**Spring concepts owned:**

```
@RequiredArgsConstructor  →  Lombok generates constructor for ALL private final fields
                              Spring injects matching beans automatically
                              adding a field = Spring wires it, no manual change

Optional<T>               →  container for "might not exist"
                              .map() if present → 200
                              .orElse() if empty → 404

repository.findById()     →  O(log n) — B-tree index on primary key
                              same speed on 100 or 100 million rows

HikariCP connection pool  →  opens N connections at startup
                              reused across all requests
                              never opens new connection at runtime

@PathVariable             →  /events/{id} — value from path
@RequestParam             →  /events?id=123 — value from query string
```

---

**Object lifetimes:**

```
App level — live forever (singleton):
    DeduplicationEngine     →  owns ConcurrentHashMap cache
    TopKEventTracker        →  owns ConcurrentHashMap counts
    EventIngestionService   →  coordinator
    repository              →  gateway to PostgreSQL
    All private final fields in @Component/@Service classes

Request level — live briefly:
    StreamEvent             →  created per HTTP request by @RequestBody
    StreamEventEntity       →  created per DB save
    EventResult             →  created per ingest() call
    DeduplicationEntry      →  created per cache miss
```

---

**Architecture layers — never cross them:**

```
Controller   →  HTTP only. calls Service. never touches Repository or Engine directly.
Service      →  coordinator. calls Engine + Repository. no HTTP knowledge.
Engine       →  pure Java algorithms. no HTTP, no DB.
Repository   →  DB only. no business logic.
```

---

**Interview questions — own these cold:**

```
Q: Why min-heap not max-heap for top K?
A: Min-heap keeps K largest seen so far. Weakest at top — evicted in O(log k).
   Max-heap requires draining all N elements. No benefit.

Q: What is the time complexity vs sorting?
A: O(n log k) with heap vs O(n log n) with sort.
   At FAANG scale with millions of types and k=10, gap is enormous.

Q: How is ConcurrentHashMap different from HashMap?
A: Stripe locking — 16 internal buckets. Threads on different keys
   never block each other. HashMap corrupts under concurrent writes.

Q: Why AtomicLong not synchronized method?
A: synchronized blocks all threads even on different keys.
   AtomicLong uses CAS — one CPU instruction, no blocking.

Q: What is check-then-act race condition?
A: Two operations that should be atomic but aren't.
   containsKey → false (Thread A), containsKey → false (Thread B),
   both insert — one overwrites the other. computeIfAbsent fixes this.

Q: Your getTopK() reads stale data — is that acceptable?
A: Yes. Analytics can be eventually consistent — slightly stale read
   is fine. Ingestion must never block. Same tradeoff Prometheus uses.

Q: How would you handle top-K across multiple pods?
A: ConcurrentHashMap is per-JVM. Cross-pod needs Redis with
   sorted sets — ZADD, ZINCRBY, ZREVRANGE.

Q: What is CAS?
A: Compare And Swap — CPU instruction. Read value, compare with
   expected, swap only if match. AtomicLong uses this. No locks.

Q: How does findById() stay fast on huge tables?
A: Primary key has automatic B-tree index in PostgreSQL.
   Binary search on disk — O(log n). 23 comparisons on 10M rows.

Q: Why ResponseEntity<?> wildcard?
A: Same method returns different types — 200 with results Map,
   400 with error Map. Wildcard handles both.

Q: What happens if k=0 or k > unique types?
A: k=0 → validation returns 400. k > unique types → returns
   whatever exists, no error. Heap handles gracefully.
```

---

**Gotchas — things that will trip you up:**

```
1.  min-heap for MAX K        →  counterintuitive, explain it every time
2.  Long.compare not (b-a)    →  overflow on large longs
3.  poll() called twice       →  stores nothing, removes element each call
                                  always store in variable first
4.  new ArrayList(heap)       →  copy without destroying heap
                                  don't poll() to drain if you need heap intact
5.  computeIfAbsent not get+put → race condition on concurrent insert
6.  @PathVariable not @RequestParam for /{id} paths
7.  404 not 400 for missing resource
8.  test files in src/test not src/main
9.  drag+drop in VS Code creates empty files — use terminal mv
10. TopKEntry is inner record  →  reference as TopKEventTracker.TopKEntry
11. @Transactional rolls back DB but NOT in-memory state
    reset() needed for TopKEventTracker in tests
12. dedup ratio stays 0 if events have different timestamps
    fingerprint includes timestamp bucket — vary payload not timestamp
```

---

**One paragraph to say in an interview:**

"I built a Top-K event tracker using a `ConcurrentHashMap` for O(1) thread-safe counting with `AtomicLong` values to prevent lost increments under concurrency. For retrieval I use a min-heap of size K — same algorithm as LC #347 — giving O(n log k) instead of O(n log n) sorting. The heap always holds the K strongest candidates with the weakest at the top ready to be evicted. Analytics reads are eventually consistent by design — ingestion never blocks for a consistent snapshot, same tradeoff Prometheus uses."