---
tags:
  - code
  - gotcha
  - ph02
  - task2
phase:
date: 2026-05-07
---

# Title

## 💡 The Point
You need to define the two data shapes it works with. Think of it like defining your nouns before writing the story.

## 📝 Notes

**`EventResult`** — what you hand back to the caller after processing. Did the event go through? Was it a duplicate? What was its fingerprint?

**`DeduplicationEntry`** — what you store _inside_ the cache. It wraps the EventResult but adds two extra fields: when was it cached, and when does it expire. The engine needs both to answer "is this entry still valid?"

**Why records and not classes?** Records are Java's way of saying "this is pure data, it doesn't do anything." Immutable by default, compiler generates `equals()`, `hashCode()`, and `toString()` for free. Perfect for things you pass around but never mutate — like cache entries and API results. An interviewer loves seeing this because it shows you know when NOT to use a full class.

---

java

```java
// src/main/java/com/streamforge/domain/EventResult.java
package com.streamforge.domain;

import java.util.UUID;

public record EventResult(
        UUID eventId,          // the persisted event's ID
        String status,         // "PROCESSED" or "DUPLICATE"
        String fingerprint,    // the SHA-256 hash from Task 1
        boolean deduplicated   // quick boolean flag for callers
) {}
```

java

```java
// src/main/java/com/streamforge/engine/DeduplicationEntry.java
package com.streamforge.engine;

import com.streamforge.domain.EventResult;
import java.time.Instant;

public record DeduplicationEntry(
        String fingerprint,
        EventResult result,    // the full result stored at cache time
        Instant createdAt,
        Instant expiresAt      // createdAt + TTL, computed once at creation
) {
    // WHY this helper? The engine shouldn't repeat this logic everywhere.
    // One place checks expiry — one place to change if logic evolves.
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
```

---

**How these two connect.** When Event 1 (the real payment) gets processed, you create an `EventResult` with status `"PROCESSED"`. You then wrap it in a `DeduplicationEntry` with `expiresAt = now + 30 minutes` and store it in the cache.


## ⚠️ Gotcha / Watch Out
When Event 2 (the retry) comes in, you pull the `DeduplicationEntry` out of the cache, call `isExpired()` — false, still valid — then return the inner `EventResult` but with status flipped to `"DUPLICATE"`.

## 🔗 Related
- 
