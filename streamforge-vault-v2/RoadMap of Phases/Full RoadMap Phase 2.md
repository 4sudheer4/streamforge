Here's the full map:

```
HTTP Request
    ↓
EventController.java          → receives POST /api/v1/events
    ↓                           "the door"
EventIngestionService.java    → orchestrates the flow
    ↓                           "the brain" — Task 4
DeduplicationEngine.java      → cache hit or miss?
    ↓                           "the gatekeeper" — Task 3
FingerprintGenerator.java     → generates SHA-256 hash
                                "the identity maker" — Task 1
```

---

**Data shapes used across the flow:**

```
StreamEvent.java        → the incoming event (input)
DeduplicationEntry.java → what's stored in cache
EventResult.java        → what's returned to caller (output)
```

---

**Supporting cast:**

```
StreamForgeApplication.java   → entry point, @EnableScheduling
application.yml               → config — TTL, DB, Redis, Kafka
```

---

One mental model to remember it:

- **Controller** — knows HTTP, knows nothing else
- **Service** — knows business logic, knows nothing about HTTP
- **Engine** — knows dedup logic, knows nothing about business rules
- **Generator** — knows hashing, knows nothing about dedup

Each layer does exactly one thing. That's why they're separate files.

  

