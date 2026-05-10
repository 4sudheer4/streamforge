[[Component reference table]]
#### The Core Idea

```
Stateless = does not remember anything between requests
Stateful  = remembers things across requests
```

---

#### Stateless — The Workers

These are singletons that do work but hold zero data between requests. Same input always gives same output.

```
FingerprintGenerator
    → receives event
    → computes SHA-256
    → returns fingerprint
    → remembers nothing
    → next request starts fresh

EventIngestionService
    → receives event
    → calls engine
    → returns result
    → remembers nothing

EventController
    → receives HTTP request
    → calls service
    → returns HTTP response
    → remembers nothing
```

Think of these as **pure functions dressed as classes.** No memory, no state, just logic.

---

#### Stateful — The Memory

This is the only component that remembers things across requests.

```
DeduplicationEngine
    → ConcurrentHashMap lives here
    → grows as events arrive
    → shared across ALL requests
    → remembers every fingerprint it has seen

cache = {
  "a3f8c2..." → DeduplicationEntry(expiresAt: 10:33)
  "b4e9d1..." → DeduplicationEntry(expiresAt: 10:35)
  "c7f2a8..." → DeduplicationEntry(expiresAt: 10:40)
}
```

This is the ONLY place in the system with memory. Everything else is stateless.

---

#### Per-Request Objects — The Travelers

These are not stateless or stateful — they're just data packets created fresh, used once, discarded.

```
StreamEvent       → born at @RequestBody, dies after processing
EventResult       → born at cache hit/miss, dies after HTTP response
DeduplicationEntry → born at cache miss, lives in ConcurrentHashMap until evicted
```

---

#### The Flow With This Lens

```
Request arrives
      ↓
EventController (stateless — just routes)
      ↓
creates StreamEvent (traveler — carries request data)
      ↓
EventIngestionService (stateless — just orchestrates)
      ↓
DeduplicationEngine (STATEFUL — checks its memory)
      ↓
FingerprintGenerator (stateless — just computes)
      ↓
cache hit?
   ↓ yes                        ↓ no
return DUPLICATE            persist to DB (stateless operation)
(memory used)               store in cache (memory updated)
      ↓                          ↓
creates EventResult (traveler — carries response data)
      ↓
EventController returns HTTP response
      ↓
StreamEvent, EventResult discarded
ConcurrentHashMap entry stays alive until TTL expires
```

---

#### One Line Summary Per Component

|Component|Type|Remembers|
|---|---|---|
|`FingerprintGenerator`|Stateless|Nothing|
|`EventIngestionService`|Stateless|Nothing|
|`EventController`|Stateless|Nothing|
|`DeduplicationEngine`|Stateful|Every fingerprint seen|
|`StreamEvent`|Traveler|Current request data|
|`EventResult`|Traveler|Current response data|
|`DeduplicationEntry`|Traveler→Stored|Lives in cache until TTL|

---

#### The FAANG Insight

Stateless components scale infinitely — spin up 100 instances, they all behave identically. Stateful components are the scaling bottleneck — `ConcurrentHashMap` is per-instance, breaks at multiple pods. That's exactly why Phase 4 moves state to Redis — one external stateful store, all pods stateless. **The goal is always to push state out of your application and into dedicated infrastructure.**