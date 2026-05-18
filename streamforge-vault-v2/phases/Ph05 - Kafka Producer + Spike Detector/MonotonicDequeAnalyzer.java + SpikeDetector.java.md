---
tags:
  - code
  - ph05
  - kafka
  - spikeDetector
  - distributed
phase:
date: 2026-05-18
---
### High-Level Program Flow

```
Every incoming HTTP request:
  POST /api/v1/events
          ↓
  EventIngestionService.ingest()
          ↓
  spikeDetector.trackEvent(sourceId)  ← count this request
          ↓
  (persist, dedup, kafka publish happen normally)

Every 1 second (background):
  @Scheduled flushBuckets()
          ↓
  for each sourceId being tracked:
    count = how many requests arrived this second
    analyzer.record(sourceId, count)
    check for spike
    if spike → publish to Kafka "anomalies"
```

Two completely independent flows. Request threads increment counters. Scheduler thread analyzes patterns.
# `MonotonicDequeAnalyzer` 

## 💡 What It Is
*One line — what is this and its role in the system.*

## 📝 How It Works
#### Fields

java

```java
private static final long WINDOW_MS = 60_000L;

private final Map<String, Deque<RequestBucket>> sourceDeques
    = new ConcurrentHashMap<>();
private final Map<String, Deque<RequestBucket>> avgDeques
    = new ConcurrentHashMap<>();
private final Map<String, AtomicLong> avgTotals
    = new ConcurrentHashMap<>();
```

**`WINDOW_MS = 60_000`** — 60 second sliding window. Everything older than this is irrelevant. Both deques expire buckets older than this.

**`sourceDeques`** — the monotonic deque. One deque per sourceId. Maintains decreasing order of `requestCount` front to back. Front is always the maximum rate seen in the last 60 seconds. Aggressively prunes dominated buckets. Used only for `getMaxInWindow()`.

**`avgDeques`** — the history deque. One deque per sourceId. Never prunes by dominance — only expires old buckets by time. Preserves full 60 second history. Used only for `getRollingAvg()` and `getBucketCount()`.

**`avgTotals`** — running sum of all `requestCount` values currently in `avgDeques`. Maintained in sync with `avgDeques` — increases on insert, decreases on time expiry. Never decreases on dominance pruning. Dividing by `avgDeque.size()` gives the rolling average in O(1).

**`ConcurrentHashMap`** — multiple threads call `record()` for different sources simultaneously. `ConcurrentHashMap` handles concurrent access per key safely without locking the entire map.

---

#### `record(sourceId, requestCount)`

This is called once per second per source from `flushBuckets()`. It takes the aggregated request count for that second and updates both deques.

java

```java
public void record(String sourceId, long requestCount) {
    Deque<RequestBucket> deque = sourceDeques
        .computeIfAbsent(sourceId, k -> new ArrayDeque<>());
    Deque<RequestBucket> avgDeque = avgDeques
        .computeIfAbsent(sourceId, k -> new ArrayDeque<>());
    AtomicLong avgTotal = avgTotals
        .computeIfAbsent(sourceId, k -> new AtomicLong(0));
```

**`computeIfAbsent`** — atomically creates a new deque/total if one doesn't exist for this sourceId. Thread safe. If two threads call `record()` for a new sourceId simultaneously, only one deque is created. The other thread gets the same instance.

java

```java
    Instant now = Instant.now();
    Instant windowStart = now.minusMillis(WINDOW_MS);
```

`windowStart` = exactly 60 seconds ago. Any bucket older than this is outside the window and must be removed.

---

**Step 1 — Expire sourceDeques front:**

java

```java
    while (!deque.isEmpty() &&
           deque.peekFirst().timestamp().isBefore(windowStart)) {
        deque.pollFirst();
    }
```

Pop from front while the oldest bucket is outside the 60 second window. Front is always the oldest because we always add to the back.

No `avgTotal` adjustment here because `sourceDeques` is not used for average calculation.

---

**Step 1.1 — Expire avgDeques front:**

java

```java
    while (!avgDeque.isEmpty() &&
           avgDeque.peekFirst().timestamp().isBefore(windowStart)) {
        avgTotal.addAndGet(-avgDeque.pollFirst().requestCount());
    }
```

Same time expiry as `sourceDeques`. But here we subtract the expired bucket's count from `avgTotal` to keep the running sum accurate.

This is the **only** place `avgTotal` decreases. It never decreases on dominance pruning.

---

**Step 2 — Dominance pruning (sourceDeques only):**

java

```java
    while (!deque.isEmpty() &&
           deque.peekLast().requestCount() < requestCount) {
        deque.pollLast();
    }
```

Pop from back while the back bucket's count is strictly less than the new count. A newer bucket with higher count dominates — the old bucket can never be the window maximum again.

**Why `<` not `<=`?** Equal-valued buckets are kept. If you used `<=`, every second with the same count would pop the previous bucket, reducing `sourceDeques` to size 1. `getBucketCount()` would always return 1, the warm-up check would never pass, and spike detection would never fire.

**`avgDeques` has NO dominance pruning.** This is the entire point of having two deques. `avgDeques` keeps all buckets in the window regardless of their count — giving `getRollingAvg()` accurate full history.

---

**Step 3 — Add new bucket to both deques:**

java

```java
    deque.addLast(new RequestBucket(now, requestCount));
    avgDeque.addLast(new RequestBucket(now, requestCount));
    avgTotal.addAndGet(requestCount);
```

Both deques get the same new bucket. `avgTotal` increases by the new count.

After this line:

- `sourceDeques` front = max rate in window
- `avgDeques` contains all buckets in last 60 seconds
- `avgTotal` = sum of all counts in `avgDeques`

---

#### `getMaxInWindow(sourceId)`

java

```java
public long getMaxInWindow(String sourceId) {
    Deque<RequestBucket> deque = sourceDeques.get(sourceId);
    if (deque == null || deque.isEmpty()) return 0L;
    return deque.peekFirst().requestCount();
}
```

O(1). Front of the monotonic deque is always the maximum. No scanning. No sorting. Just peek.

Returns 0 if no data yet — safe default that prevents false spikes on startup.

---

#### `getBucketCount(sourceId)`

java

```java
public int getBucketCount(String sourceId) {
    Deque<RequestBucket> avgDeque = avgDeques.get(sourceId);
    return avgDeque == null ? 0 : avgDeque.size();
}
```

Returns how many seconds of history exist in the window. Used by `SpikeDetector` as a warm-up check — don't alert until at least 5 seconds of baseline exist.

**Why `avgDeques` not `sourceDeques`?**

After a spike, `sourceDeques.size()` = 1 (dominance pruning removed everything). `avgDeques.size()` = full history count. If you used `sourceDeques`, the warm-up check `bucketCount >= 5` would fail after every spike, preventing detection of subsequent spikes.

---

#### `getRollingAvg(sourceId)`

java

```java
public double getRollingAvg(String sourceId) {
    Deque<RequestBucket> avgDeque = avgDeques.get(sourceId);
    AtomicLong total = avgTotals.get(sourceId);
    if (avgDeque == null || avgDeque.isEmpty()) return 0.0;
    return (double) total.get() / avgDeque.size();
}
```

O(1). `avgTotal` is the precomputed sum. `avgDeque.size()` is the count. Division gives the average.

No iteration. No summing. All maintained incrementally in `record()`.

Returns 0.0 if no data — safe default.

------
------
------
### SpikeDetector — Full Walkthrough

#### Fields

java

```java
private static final double SPIKE_MULTIPLIER = 3.0;
private static final String ANOMALIES_TOPIC = "anomalies";

private final MonotonicDequeAnalyzer analyzer;
private final KafkaTemplate<String, String> kafkaTemplate;

private final Map<String, AtomicLong> currentBucketCount
    = new ConcurrentHashMap<>();
```

**`SPIKE_MULTIPLIER = 3.0`** — a source must send 3x their rolling average before it's considered a spike. Lower = more sensitive (more false positives). Higher = less sensitive (misses real spikes). 3x is the NFCU calibration for payment event anomaly detection.

**`currentBucketCount`** — one `AtomicLong` per sourceId. Counts individual requests as they arrive. Reset to 0 every second by `flushBuckets()`.

**`AtomicLong`** — multiple request threads increment the same counter simultaneously. `AtomicLong.incrementAndGet()` is a single atomic CPU instruction — no race condition possible. Regular `long` would lose increments under concurrency.

---

#### `trackEvent(sourceId)`

java

```java
public void trackEvent(String sourceId) {
    currentBucketCount
        .computeIfAbsent(sourceId, k -> new AtomicLong(0))
        .incrementAndGet();
}
```

Called on every single incoming request regardless of deduplication status. You want to track total traffic volume — a flood of duplicate requests is still a spike worth detecting.

Extremely lightweight — one atomic increment. Never blocks. Never touches the deque. Never allocates memory (after first request per source).

---

#### `flushBuckets()`

java

```java
@Scheduled(fixedRate = 1000)
public void flushBuckets() {
    currentBucketCount.forEach((sourceId, counter) -> {

        // read count for this second and atomically reset to 0
        long count = counter.getAndSet(0);

        // tell analyzer about this second
        analyzer.record(sourceId, count);

        // get stats
        long maxInWindow = analyzer.getMaxInWindow(sourceId);
        double rollingAvg = analyzer.getRollingAvg(sourceId);
        int bucketCount = analyzer.getBucketCount(sourceId);

        // spike check
        if (rollingAvg > 0 && bucketCount >= 5 && count > SPIKE_MULTIPLIER * rollingAvg) {
            double multiplier = count / rollingAvg;
            log.warn("SPIKE detected sourceId={} count={} rollingAvg={} multiplier={}x",
                sourceId, count, rollingAvg, String.format("%.1f", multiplier));

            String spikePayload = String.format(
                "{\"sourceId\":\"%s\",\"count\":%d,\"rollingAvg\":%.1f,\"multiplier\":%.1fx,\"timestamp\":\"%s\"}",
                sourceId, count, rollingAvg, multiplier, Instant.now()
            );
            kafkaTemplate.send(ANOMALIES_TOPIC, sourceId, spikePayload);
        }
    });
}
```

Runs on a single scheduler thread. Never concurrent with itself.

---

**`counter.getAndSet(0)`** — atomically reads the current count AND resets it to 0 in one operation. If you did `get()` then `set(0)` separately, requests arriving between those two calls would be silently lost — they'd be counted in this second's total but reset before being seen.

---

**`analyzer.record(sourceId, count)`** — passes this second's total to the analyzer. Creates a `RequestBucket(now, count)` and adds it to both deques. Updates rolling average tracking.

---

**`rollingAvg > 0`** — don't alert if no baseline exists yet. First second of traffic would otherwise always trigger a spike since any count > 3x0.

**`bucketCount >= 5`** — require at least 5 seconds of history before alerting. Without this, a source sending 50 events in its very first second would trigger a spike against a baseline of 50 — always `50 > 3x50 = false` but the warm-up prevents misleading alerts during the first few seconds.

**`count > SPIKE_MULTIPLIER * rollingAvg`** — the spike condition. Current second's count must exceed 3x the rolling average of the last 60 seconds. This is relative detection — a source normally sending 1000/sec spiking to 3001/sec triggers the same alert as a source normally sending 5/sec spiking to 16/sec.

---

**`kafkaTemplate.send(ANOMALIES_TOPIC, sourceId, spikePayload)`** — publishes spike event asynchronously. Uses `sourceId` as key so all spikes from the same source land on the same partition in order. Downstream alert services consume this topic.

---

### Complete Execution Timeline

```
T=0s    payment-service starts sending 5 requests/sec

T=1s    flushBuckets():
          count=5, record(payment-service, 5)
          sourceDeques=[bucket(5)]  avgDeques=[bucket(5)]
          rollingAvg=5.0  bucketCount=1
          bucketCount < 5 → no spike check

T=2s    flushBuckets():
          count=5, record(payment-service, 5)
          sourceDeques=[bucket(5),bucket(5)]
          avgDeques=[bucket(5),bucket(5)]
          rollingAvg=5.0  bucketCount=2
          bucketCount < 5 → no spike check

T=5s    flushBuckets():
          count=5, record(payment-service, 5)
          bucketCount=5 → warm-up complete, spike checks begin
          5 > 3x5=15? NO → no spike

T=15s   flushBuckets():
          count=5  rollingAvg=5.0  bucketCount=15
          5 > 15? NO → no spike

T=16s   50 concurrent requests arrive
        trackEvent() called 50 times → currentBucketCount=50

        flushBuckets():
          count=50  getAndSet(0) → reset to 0

          analyzer.record(payment-service, 50):
            sourceDeques:
              expire front? NO — all within 60s
              dominance pop: 5 < 50 → pop all 15 buckets
              addLast(bucket(50))
              sourceDeques=[bucket(50)]

            avgDeques:
              expire front? NO
              NO dominance pop
              addLast(bucket(50))
              avgDeques=[bucket(5)×15, bucket(50)]
              avgTotal = 75+50 = 125

          getMaxInWindow() = 50        (sourceDeques front)
          getRollingAvg()  = 125/16 = 7.8  (avgTotal/avgDeque.size)
          getBucketCount() = 16        (avgDeques.size)

          rollingAvg=7.8 > 0 ✅
          bucketCount=16 >= 5 ✅
          50 > 3x7.8=23.4 ✅ → SPIKE

          log.warn("SPIKE detected count=50 rollingAvg=7.8 multiplier=6.4x")
          kafkaTemplate.send("anomalies", "payment-service", spikePayload)
```

---

### The Key Design Decisions — Senior Engineer Lens

**Why not use a heap instead of a deque?**

Heap gives O(log k) per insertion and doesn't handle expiry cleanly. Monotonic deque is O(1) amortized. On a hot path called every second per source, that difference matters at scale.

**Why `@Scheduled` every second instead of per-event calculation?**

Per-event calculation means calling `getRollingAvg()` on every single request. At 1000 req/sec × 1000 sources = 1 million calculations/sec just for spike detection. Bucketing into 1-second windows reduces that to 1000 calculations/sec — a 1000x reduction with acceptable precision loss.

**Why two deques instead of one?**

Max tracking requires aggressive pruning for O(1) lookup. Average tracking requires full history. These requirements directly conflict. Separating them into two deques lets each be optimized for its specific access pattern without compromise.

**Why publish spike to Kafka instead of alerting directly?**

Decoupling. `SpikeDetector` doesn't know what to do with a spike — that's not its job. Publishing to Kafka means any number of downstream services can react independently: PagerDuty alerts, fraud scoring, automatic rate limit tightening, dashboard updates. Adding a new reaction requires zero changes to `SpikeDetector`.

**Why `sourceId` as Kafka key for anomalies topic?**

All spikes from `payment-service` land on the same partition in order. A downstream fraud detection service reading partition 4 sees all `payment-service` spikes chronologically — critical for correlating patterns across multiple consecutive spikes.

---

### Interview One-Liners — Cold Answer Ready

**"Explain your spike detection algorithm:"** _"I maintain a monotonic deque per source that gives O(1) sliding window max, and a separate history deque for O(1) rolling average. Every second I compare the current request rate against the 60-second rolling average — anything above 3x triggers a spike event published to Kafka."_

**"Why two deques?"** _"Max tracking needs aggressive dominance pruning which destroys history. Average tracking needs full history. One deque can't serve both without compromising one, so I separated them."_

**"What's the time complexity?"** _"O(1) per second per source for both max lookup and average calculation. The deque operations are O(n) amortized total across the stream — each bucket added once, removed at most once."_

**"How do you handle concurrency?"** _"Request threads only touch AtomicLong counters — one atomic increment per request. The scheduler thread is the only one reading counters and writing to deques, so there's no contention on the deque itself."_

**"How would you scale this to 10,000 sources?"** _"The current design is O(1) per source per second — 10,000 sources means 10,000 deque operations per second, well within a single JVM's capacity. For larger scale I'd move to Kafka Streams which handles distributed windowing, state stores, and fault tolerance out of the box."_
## ⚠️ Gotcha


## 🔗 Related
- 
