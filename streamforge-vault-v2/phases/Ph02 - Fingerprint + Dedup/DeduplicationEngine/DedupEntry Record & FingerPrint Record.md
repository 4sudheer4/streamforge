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

When Event 2 (the retry) comes in, you pull the `DeduplicationEntry` out of the cache, call `isExpired()` — false, still valid — then return the inner `EventResult` but with status flipped to `"DUPLICATE"`.

## ⚠️ Gotcha / Watch Out

Q: but event 2 that enters after 5 mins of event 1, with same payload will anyways have new fingerprint. what is the point of 30 min cache time?

The actual valid reason for 30-min TTL is simpler — **same bucket, network slowness**. Imagine Event 1 arrives at 10:03:00 and gets cached. A retry arrives at 10:04:58 — still same bucket, same fingerprint — but what if your cache evicted it after 5 minutes at 10:08:00? You'd never hit that scenario anyway since the bucket closed at 10:05.

Honestly the 30-min TTL is somewhat redundant given the 5-min bucket. The real production reason is **cost of reprocessing vs cost of memory**. Keeping entries alive longer costs a little RAM but protects against edge cases you haven't thought of yet. It's a conservative default.

You caught a genuine design tension here. Good instinct — this is exactly the kind of thing an interviewer probes.

The 30 min just gives you a wide safety net. You could have a cache hit anywhere within that window as long as the retry also falls in the same 5-min bucket.

## 🔗 Related
- 
