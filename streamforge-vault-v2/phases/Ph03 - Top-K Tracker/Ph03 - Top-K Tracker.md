---
tags: [phase, ph05]
status: not-started
---

# Ph05 - Top-K Tracker

> TopKEventTracker with min-heap, GET /api/v1/analytics/top-events

---

## 📋 What I Built
- 
**Big picture first — what problem are we actually solving?**

You have a stream of incoming events. Each event has a `type` (e.g., `"payment"`, `"login"`, `"sms"`). At any moment, a product manager or ops engineer wants to know: _"what are the top 10 most frequent event types right now?"_

The naive approach: store every event, then sort them by count. On 10 million events that's O(n log n) every time someone hits the endpoint. That's unusable.

The correct approach is exactly LC #347 — **keep a min-heap of size K running at all times**, so `getTopK(k)` is O(n log k), not O(n log n). And counting is O(1) because a `ConcurrentHashMap` does it.

This is why the schedule pairs LC #347 with this task — you're not just doing them in parallel, **they're the same algorithm**. The LC problem is the pure form; `TopKEventTracker` is the production form.

## 📎 Sub-Notes
### Task1

**Concept: why `ConcurrentHashMap<String, AtomicLong>`?**

You need two things:

- Count per type — that's a `Map<String, Long>`
- Thread-safe — because multiple HTTP threads hit `record()` simultaneously

`HashMap` + `synchronized` works but becomes a bottleneck — every thread waits for the lock even if they're updating _different_ keys.

`ConcurrentHashMap` solves this with **stripe locking** — it partitions the map into 16 buckets internally and only locks the relevant bucket. Threads touching different keys never block each other.

`AtomicLong` for the value — because `++` on a plain `long` is not atomic. Two threads reading `5`, both incrementing to `6`, writing `6` — you lost a count. `AtomicLong.incrementAndGet()` is one CPU instruction (CAS — compare and swap). No lock, no lost counts.

```java
// src/main/java/com/streamforge/engine/TopKEventTracker.java
package com.streamforge.engine;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class TopKEventTracker {

    private final ConcurrentHashMap<String, AtomicLong> counts = new ConcurrentHashMap<>();

    public record TopKEntry(int rank, String type, long count, double pct) {}
```

### Task 2: `record()` — the increment, O(1)

```java
    /**
     * Called on every event. O(1).
     *
     * computeIfAbsent is the key here — it's atomic in ConcurrentHashMap.
     * It checks if the key exists and creates a new AtomicLong(0) only if
     * it doesn't — all in one operation. No two threads can both decide
     * "key doesn't exist" and both insert, because the check+insert is
     * atomic under ConcurrentHashMap's stripe lock for that bucket.
     */
    public void record(String type) {
        counts.computeIfAbsent(type, k -> new AtomicLong(0)).incrementAndGet();
    }
```

**Why not `counts.put(type, counts.getOrDefault(type, new AtomicLong(0)))`?**

Because `getOrDefault` + `put` is two separate operations. Between those two calls another thread could have inserted the key. `computeIfAbsent` is one atomic operation — the check and the insert happen together under the lock. 
This is a classic **check-then-act** race condition. FAANG interviewers love asking about this.


---

## 💥 Gotchas
> One-liners only — create a full [[Gotcha]] note in this folder for details.
- 

## ✅ Done When
- 

---

← [[Home]] · Next → [[Ph06 - Redis Rate Limiter]]
