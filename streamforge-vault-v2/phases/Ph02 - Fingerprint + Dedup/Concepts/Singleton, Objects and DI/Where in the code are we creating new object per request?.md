**Dependency Injection** — specifically **Constructor Injection**.

The full picture:

```
Dependency         → FingerprintGenerator (the thing being injected)
Injection          → Spring passing it into the constructor
Constructor        → where the injection happens
```

**One line each:**

```
DI   → don't create your dependencies, receive them
IoC  → you don't control the flow, the framework does
CI   → receive dependencies through the constructor specifically
```

Spring is an **IoC container** — it controls object creation and wiring so you don't have to.
We're not explicitly doing `new StreamEvent()` anywhere ourselves.

------------
**One can Resuse connected object (DI) if its an operation. But if not create a new one.**
```
Operation (does the same thing regardless of data) → inject, reuse
    FingerprintGenerator → always SHA-256
    KafkaTemplate        → always sends to topic
    RedisTemplate        → always checks cache
    DeduplicationEngine  → always checks for duplicates

Data (unique to one moment, one event, one request) → new, throwaway
    StreamEvent          → this specific event's data
    EventResult          → this specific request's outcome
    SpikeEvent           → this specific spike's details
    StreamEventEntity    → this specific DB row
```
One line to remember it:

```
Operations are reusable — inject them.
Data is unique — create it fresh.
```
---
---------
Example: **Same operation, different data → inject the operator:**

```
FingerprintGenerator  → always does SHA-256, doesn't matter what event
KafkaTemplate         → always sends to topic, doesn't matter what message
RedisTemplate         → always checks cache, doesn't matter what key
```

Operation is fixed. Data changes. Inject the operation.

**Data specific to one moment → create with new:**

```
StreamEventEntity     → specific to THIS event's data
EventResult           → specific to THIS request's outcome
SpikeEvent            → specific to THIS spike's rate and time
```

Can't inject because the data doesn't exist at startup. Only exists when the event arrives.

-----------------
---------
---------

One different note:

```java
@PostMapping
public ResponseEntity<EventResult> ingest(@RequestBody StreamEvent event) {
//                                        ↑
//                         Spring creates new StreamEvent here
//                         for every single incoming request
```

`@RequestBody` tells Spring: "deserialize the JSON from this HTTP request into a `StreamEvent` object." Spring uses Jackson to do:


```java
// what Spring does internally on every request
StreamEvent event = objectMapper.readValue(requestBody, StreamEvent.class);
// brand new StreamEvent object created from the JSON
```

---

**And `EventResult` — created fresh per request here:**


```java
// in persistToDatabase — new result on every cache miss
return new EventResult(
    entity.getId(),
    "PROCESSED",
    event.fingerprint(),
    false
);

// in deduplicateOrProcess — new result on every cache hit
return new EventResult(
    existing.result().eventId(),
    "DUPLICATE",
    fingerprint,
    true
);
```

---

**Summary:**

```
Singletons — created once at startup
    EventController
    EventIngestionService
    DeduplicationEngine
    FingerprintGenerator

Per request — created fresh every time
    StreamEvent      ← Spring creates via @RequestBody
    EventResult      ← we create manually in code
    DeduplicationEntry ← we create on cache miss
```