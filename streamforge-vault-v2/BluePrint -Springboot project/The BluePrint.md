
**Every backend project, every company, every use case follows the same skeleton:**

```
HTTP IN → Controller → Service → Engine/Domain → Repository → DB OUT
```

That's it. Every layer has one job. Never crosses into another layer's territory.

---

### How to think when starting from scratch

**Step 1 — What is the system doing in one sentence?**

```
StreamForge → receives events, deduplicates them, tracks patterns
Uber        → matches riders to drivers
Twitter     → stores and distributes tweets
```

One sentence. If you can't say it in one sentence, you don't understand the problem yet.

---

**Step 2 — What is the data?**

This becomes your `domain` package.

Ask: _"what is the core object this system moves around?"_

```
StreamForge  → StreamEvent
Uber         → Ride, Driver, Rider
Twitter      → Tweet, User
```

These become your records or entities. Everything else in the system exists to create, transform, or store these objects.

---

**Step 3 — What are the operations on that data?**

This becomes your `engine` package.

Ask: _"what does the system DO to the data?"_

```
StreamForge  → deduplicate it, fingerprint it, count frequencies
Uber         → match it, price it, route it
Twitter      → rank it, distribute it, moderate it
```

Each operation becomes one class. One class, one job.

```
FingerprintGenerator   →  only generates fingerprints
DeduplicationEngine    →  only deduplicates
TopKEventTracker       →  only tracks frequencies
```

---

**Step 4 — Who needs to talk to the outside world?**

This becomes your `api` package.

Ask: _"what HTTP endpoints does the outside world need?"_

```
POST /events          →  EventController
GET  /analytics       →  AnalyticsController
GET  /health          →  HealthController
```

Controllers never contain logic. They only:

```
1. receive request
2. call service
3. return response
```

If you find yourself writing an if statement in a controller that isn't about HTTP — move it to the service.

---

**Step 5 — What needs to be stored?**

This becomes your `infra` package.

Ask: _"what outlives a single request?"_

```
StreamForge  → events in PostgreSQL, dedup cache in Redis
Uber         → rides in PostgreSQL, driver locations in Redis
Twitter      → tweets in Cassandra, timeline cache in Redis
```

Rule of thumb:

```
Relational data with queries  →  PostgreSQL
Fast temporary state          →  Redis
Event streams                 →  Kafka
```

---

**Step 6 — What connects the layers?**

This becomes your `service` layer — but in StreamForge we embedded it in `engine`. In larger projects it's separate.

The service layer:

```
1. calls engine for business logic
2. calls repository for persistence
3. coordinates between them
4. returns result to controller
```

---

### The decision tree for every new class

```
Does it handle HTTP?          →  api/ (Controller)
Does it contain an algorithm? →  engine/ (Engine)
Is it a data shape?           →  domain/ (Record/Entity)
Does it talk to external systems? → infra/ (Repository/Producer/Client)
Does it configure Spring?     →  config/ (Configuration)
Is it shared utility?         →  common/ (Converter/Exception)
```

---

### The stateless vs stateful rule

```
Stateless  →  singleton, inject everywhere, no memory between calls
               FingerprintGenerator, EventController, EventIngestionService

Stateful   →  singleton BUT holds shared memory
               DeduplicationEngine (ConcurrentHashMap)
               TopKEventTracker (ConcurrentHashMap)
               Redis, PostgreSQL, Kafka (external state)
```

---

### The dependency rule — who can call who

```
Controller  →  can call Service, cannot call Engine or Repository directly
Service     →  can call Engine and Repository, cannot call Controller
Engine      →  pure Java, calls nothing outside itself
Repository  →  only talks to DB, knows nothing about business logic
```

If you find a Controller calling a Repository directly — that's a design smell. A senior engineer will flag it immediately in code review.

---

### Applied to any new project

Say you're building a **fraud detection system**:

```
Step 1 — one sentence:
"Receives transactions, scores them for fraud, blocks suspicious ones"

Step 2 — domain:
Transaction record — id, amount, merchantId, userId, timestamp

Step 3 — engines:
RiskScoreEngine      →  calculates fraud score
VelocityChecker      →  checks transaction frequency per user
MerchantRiskTracker  →  tracks top-K risky merchants

Step 4 — api:
POST /transactions          →  TransactionController
GET  /analytics/risk        →  RiskAnalyticsController

Step 5 — infra:
PostgreSQL  →  store transactions
Redis       →  velocity cache per userId
Kafka       →  publish flagged transactions

Step 6 — service:
TransactionService.process()
    → velocityChecker.check()
    → riskScoreEngine.score()
    → if score > threshold → publish to Kafka
    → persist to PostgreSQL
    → return result
```

Same blueprint. Different domain.

---

### The one mental model to remember

```
Data flows in one direction:

HTTP → Controller → Service → Engine → Repository → DB
                ↑                 ↑
           HTTP concerns     business concerns
           (status codes)    (algorithms, rules)
```

Every class you ever write fits somewhere on this line. When you're unsure where a class belongs — ask "what concern does this address?" and place it in the right layer.

---

That's the blueprint. StreamForge is teaching you this pattern across 15 phases — each phase adds one engine, one controller, one infra component. By Week 7 you'll have built every layer multiple times and the blueprint will be instinct.