---
tags:
  - gotcha
  - ph02
  - database
phase:
date: 2026-05-08
---

# Concept: Title

## 💡 What It Is

This is the brain. It's the first place in the codebase that knows about ALL the pieces — fingerprinting, deduplication, AND the database. Its job is to orchestrate them in the right order.

This is also where the `processor` lambda you've been curious about finally gets defined. The service knows what "processing" means — persist to PostgreSQL. It passes that knowledge to the engine as a function. The engine just decides whether to call it.
## 🔍 How It Works

**The flow inside EventIngestionService:**

```
1. Receive StreamEvent
2. Call deduplicationEngine.deduplicateOrProcess()
3. Pass "persist to DB" as the processor lambda
4. Engine either hits cache → returns DUPLICATE
         or misses cache → calls our lambda → persists → returns PROCESSED
5. Return EventResult to controller
```
## 🛠️ How I Used It in StreamForge

check [[Full RoadMap Phase 2]]

The orchestrator. Sits between the HTTP layer and the dedup engine. Only class in the codebase that knows about both the database AND deduplication.

---

**How it's used:**

```
POST /api/v1/events (StreamEvent JSON)
         ↓
EventController → service.ingest(event)
         ↓
service calls deduplicationEngine.deduplicateOrProcess(event, this::persistToDatabase)
         ↓
engine generates fingerprint → checks cache
         ↓ hit                        ↓ miss
return DUPLICATE              service's persistToDatabase runs
                                       ↓
                               saves to PostgreSQL
                                       ↓
                               return PROCESSED
```

---

**The one key design decision:** This Service passes `this::persistToDatabase` as a function to the engine. Engine [[DeduplicationEngine.java]] decides IF it runs. Service decides WHAT it does. Neither knows the other's internals.

---

**In plain English:** Service says to engine — _"here's the event, here's what to do if it's new, you decide whether it's new."_

Engine says back — _"already seen it"_ or _"it's new, I ran your logic, here's the result."_

That's the entire relationship.

  

Sonnet 4.6
## ⚠️ Watch Out For
**1. `this::persistToDatabase` is called on cache miss only** If you put any logic outside the lambda — like logging or validation — it runs on EVERY event including duplicates. Keep pre-processing logic inside the lambda or before the `deduplicateOrProcess` call intentionally.

**2. `repository.save()` is synchronous** The HTTP thread waits for PostgreSQL to respond before returning. Under load this becomes the bottleneck — not the dedup engine.

**3. `StreamEventEntity` needs both constructors** Forget the no-arg constructor → JPA silently fails when reading from DB. Not a compile error — a runtime error that's annoying to debug.

**4. `@Service` vs `@Component`** Functionally identical but never use `@Component` on a service class. Reviewers will notice. Use the right semantic annotation.

## Interview prep

**Q: Why does EventIngestionService exist? Why not put logic in the controller?** A: Controller should only know about HTTP — request parsing, response codes. Business logic in the controller makes it untestable and violates single responsibility. Service layer is testable in isolation with no HTTP context needed.

---

**Q: How would you test EventIngestionService without a real database?** A: Mock the repository and deduplication engine. Pass a simple lambda as processor. Test the orchestration logic in complete isolation — no Spring context, no DB, no network.

java

```java
DeduplicationEngine mockEngine = mock(DeduplicationEngine.class);
StreamEventRepository mockRepo = mock(StreamEventRepository.class);
EventIngestionService service = new EventIngestionService(mockEngine, mockRepo);
```

---

**Q: What happens if PostgreSQL is down when persistToDatabase runs?** A: Currently — exception propagates up, HTTP caller gets 500. Production fix is retry logic with exponential backoff, circuit breaker pattern, and Kafka as a durable buffer so events aren't lost. Phase 5 addresses this.

---

**Q: Why pass persistToDatabase as a function instead of calling it directly inside the engine?** A: Inversion of control. Engine's responsibility is dedup decisions only. If engine called the DB directly it would have two responsibilities — dedup AND persistence. Tomorrow if you swap PostgreSQL for MongoDB you'd touch the engine — wrong. With this design you only touch the service.

---

**Q: How does this scale to multiple instances?** A: It doesn't currently — ConcurrentHashMap is per-instance. Three pods means three independent caches. Event 1 hits Pod A, retry hits Pod B — cache miss — double processed. Phase 4 fixes this by moving cache to Redis — one shared cache across all pods.

---

**The one answer that impresses most:** If they ask any scalability question — always connect it back to the next phase. Shows you designed the system with evolution in mind, not just the current state.
## 📌 Commands / Snippets
```


```

## 🔗 Related
- 
