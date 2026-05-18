---
tags: [java, ph07]
date: 
---

# MonotonicDeque Explained

## 💡 The Point
How the deque maintains a decreasing sequence — pop back on domination, pop front on expiry.
A deque that maintains a strictly monotonic (increasing or decreasing) order from front to back. You enforce this by popping elements from the back before inserting a new one.

## 📝 Notes

**Monotonic Decreasing** (what you built):

```
Front = largest   →   Back = smallest
[89, 47, 23, 5]   ← always decreasing front to back
```

**Monotonic Increasing** (less common):

```
Front = smallest  →   Back = largest
[5, 23, 47, 89]
```

---

### The Core Algorithm (LC #239)

java

```java
Deque<Integer> deque = new ArrayDeque<>();
int[] result = new int[n - k + 1];

for (int i = 0; i < n; i++) {
    // 1. expire front if outside window
    if (!deque.isEmpty() && deque.peekFirst() <= i - k) {
        deque.pollFirst();
    }
    
    // 2. pop back while dominated
    while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
        deque.pollLast();
    }
    
    // 3. add current index
    deque.addLast(i);
    
    // 4. record max once window is full
    if (i >= k - 1) {
        result[i - k + 1] = nums[deque.peekFirst()];
    }
}
```

**Time:** O(n) — each element added once, removed once **Space:** O(k) — deque never exceeds window size

---

### Why Store Indices Not Values

```
Store value 3:
  Window slides → 3 leaves → no way to know it left
  
Store index 1 (value=3):
  Window slides → check: is index 1 < i - k? → YES → expired → pop
```

**Interview one-liner:** _"Indices give you both the value via array lookup AND the position to check expiry — values alone can't tell you where they came from."_

---

### The Dominance Rule

When a new element arrives, pop everything from the back that is smaller or equal.

```
Why? A newer, bigger element dominates:
  - Newer  → stays in window longer
  - Bigger → will always win over the old element

The old element can NEVER be the window maximum again.
It's useless. Remove it immediately.
```

**Interview one-liner:** _"We prune dominated elements because a newer, larger value makes them permanently irrelevant — they can never be the window maximum for any future window position."_

---

### `<=` vs `<` — The Critical Distinction

This is the gotcha that will separate you from other candidates.

**LC #239 — pure max tracking:**

java

```java
while (nums[deque.peekLast()] <= nums[i])  // pop equal values too
```

Equal values don't matter for max — keep only the newest.

**StreamForge — max + rolling average:**

java

```java
while (deque.peekLast().requestCount() < requestCount)  // strict less than
```

Must keep equal values to preserve history for rolling average.

```
With <=:
  [5,5,5,5,5] → new 5 arrives → pops all 5s → deque=[5] → bucketCount=1
  rollingAvg = 5/1 = 5 → always wrong

With <:
  [5,5,5,5,5] → new 5 arrives → keeps all → deque=[5,5,5,5,5,5]
  rollingAvg = 30/6 = 5 → correct
```

**Interview one-liner:** _"Use strict less-than when you need to preserve equal-valued elements for history — less-than-or-equal destroys duplicates which corrupts any average calculation over the window."_

---

### Two Deques For Two Purposes

The most senior-level insight from building this in production.

```
One deque cannot serve two masters:

sourceDeques  →  monotonic  →  aggressive back pruning  →  O(1) max
avgDeques     →  simple     →  time expiry only          →  accurate avg
```

**Why they conflict:**

```
Spike arrives (count=50, baseline=5):

sourceDeques: pops all 5s → [50]          → max=50 ✅
              size=1                        → avg=50/1=50 ❌

avgDeques:    keeps all 5s → [5,5,...,5,50] → max=wrong
              size=16                        → avg=125/16=7.8 ✅
```

**Interview one-liner:** _"Max tracking needs aggressive pruning for O(1) lookup; average tracking needs full history — these requirements directly conflict, so we separate them into two deques each optimized for one purpose."_

---

### Production vs LC #239 — Key Differences

```
LC #239                          StreamForge Production
────────────────────────────────────────────────────────────────
Array indices                    RequestBucket(timestamp, count)
Fixed window size k              Time-based window (60 seconds)
Single deque                     Two deques (max + avg)
Store indices                    Store full objects
i - k expiry check               timestamp.isBefore(now - 60s)
O(n) total                       O(1) per event on hot path
Single source                    ConcurrentHashMap per sourceId
Single threaded                  AtomicLong for thread safety
```

---


---

### Time & Space Complexity — How To Explain It

**"Isn't it O(n*k) because of the while loop?"**

This is the most common interviewer trap. Answer:

_"It looks like O(n_k) but it's actually O(n) amortized. Each element is added to the deque exactly once and removed at most once — either from the front on expiry or from the back on dominance. So across the entire array, total operations are 2n — O(n) total, O(1) amortized per element."*

```
n=8, k=3:
Element 5  → added once, removed once (dominated by 3)
Element 3  → added once, removed once (dominated by -1... wait no)
...
Total pops across entire run ≤ n
Total pushes = n
Total operations = 2n = O(n)
```

---

### Related Problems — Pattern Family

```
LC #239  Sliding Window Maximum          ← the canonical problem
LC #862  Shortest Subarray with Sum ≥ K  ← monotonic increasing deque
LC #907  Sum of Subarray Minimums        ← monotonic stack variant
LC #1438 Longest Subarray with Abs Diff  ← two deques simultaneously
LC #2398 Max Number of Robots (Hard)     ← deque + sliding window combined
```

**Pattern signal:** Any problem asking for max/min in a sliding window → reach for monotonic deque first.

---

### StreamForge NFCU Context — Interview Narrative

_"At Navy Federal I built a real-time anomaly detection system for payment event streams. We needed to detect when a source's transaction rate spiked beyond 3x their rolling baseline — indicating potential fraud or a system misconfiguration._

_The naive approach was O(n) per second — scanning all 60 buckets in the window every second. At 1000 sources that's 60,000 operations per second just for max tracking._

_I implemented a monotonic deque that gives O(1) max lookup — each bucket is added once and removed once, so O(n) total across the entire stream. But I hit a subtle production bug: using `<=` for dominance pruning destroyed the equal-valued buckets needed for rolling average calculation. The fix was separating max tracking and average tracking into two independent deques — each optimized for its specific access pattern._

_The system detected an 8.8x traffic spike in our test environment within 1 second of it occurring, published a SpikeEvent to Kafka's anomalies topic, and the downstream alert service notified on-call within 30 seconds."_

---

### One-Sentence Interview Answers

**"What is a monotonic deque?"** _"A deque maintaining strictly increasing or decreasing order by popping dominated elements from the back before insertion — gives O(1) sliding window max/min."_

**"Why not just use a max-heap?"** _"Heap gives O(log k) per operation and doesn't handle expiry cleanly — monotonic deque is O(1) amortized and handles both insertion and expiry in a single pass."_

**"What's the space complexity?"** _"O(k) — the deque never holds more than k elements since elements outside the window are expired from the front."_

**"When would you use monotonic increasing vs decreasing?"** _"Decreasing for sliding window maximum, increasing for sliding window minimum or next-smaller-element problems."_
## ⚠️ Gotcha / Watch Out

### Gotchas — Points Where Candidates Fail

**Gotcha 1 — Storing values instead of indices:**

```
// WRONG
deque.addLast(nums[i]);  // can't check expiry

// RIGHT
deque.addLast(i);  // index lets you check i - k
```

**Gotcha 2 — Wrong expiry condition:**

java

```java
// WRONG — off by one
if (deque.peekFirst() < i - k)

// RIGHT
if (deque.peekFirst() <= i - k)
// or equivalently
if (deque.peekFirst() < i - k + 1)
```

**Gotcha 3 — Checking back value instead of back index:**

java

```java
// WRONG
while (deque.peekLast() <= nums[i])  // comparing index to value

// RIGHT
while (nums[deque.peekLast()] <= nums[i])  // get value via index
```

**Gotcha 4 — Recording result before window is full:**

java

```java
// WRONG — records from i=0
result[i] = nums[deque.peekFirst()];

// RIGHT — wait for first full window
if (i >= k - 1) {
    result[i - k + 1] = nums[deque.peekFirst()];
}
```

**Gotcha 5 — Using `<=` when you need history (your bug):**

```
Destroys equal-valued elements needed for rolling average.
Use `<` when downstream calculations need full history.
```

**Gotcha 6 — Not handling empty deque before peek:**

java

```java
// WRONG — NullPointerException when deque is empty
if (deque.peekFirst() <= i - k)

// RIGHT
if (!deque.isEmpty() && deque.peekFirst() <= i - k)
```

## 🔗 Related
- [[Ph07 - Kafka Producer + Spike Detector]]
