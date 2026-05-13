---
tags:
  - java
  - ph03
  - code
  - task3
  - interview
date:
---

# Min-Heap Top-K Pattern

## 💡 The Point
Why a min-heap of size K gives you top-K in O(n log k) — smaller is evicted, larger stays.

## 📝 Notes
### Top-K + Min-Heap Pattern — Reference Notes

---

**The core algorithm**

```
1. Count frequencies        → HashMap / ConcurrentHashMap
2. Build min-heap of size K → PriorityQueue with comparator
3. Iterate map              → offer each entry, if size > k → poll()
4. Result                   → heap contains exactly top K
```

Time: O(n log k). Space: O(n + k).

---

**Why min-heap to find MAX K elements?**

Min-heap keeps the K largest seen so far. The minimum of those K sits at the top — ready to be evicted when a stronger candidate arrives.

```
heap = top K candidates
top of heap = weakest of those K
new entry > heap top → evict weakest, insert new
new entry < heap top → skip, can't crack top K
```

Max-heap doesn't give you this — you'd drain all N elements anyway. No benefit.

---

**Why ConcurrentHashMap + AtomicLong?**

```
HashMap              → corrupts under concurrent writes (infinite loops, lost entries)
ConcurrentHashMap    → stripe locking, threads on different keys never block
AtomicLong           → atomic CAS increment, no lost counts
plain long           → Thread A reads 5, Thread B reads 5, both write 6 → lost count
```

---

**Why computeIfAbsent not containsKey + put?**

```
containsKey → false   (Thread A)
containsKey → false   (Thread B)
put AtomicLong(0)     (Thread A)
put AtomicLong(0)     (Thread B) ← overwrites A's AtomicLong, count lost forever
```

`computeIfAbsent` collapses check + insert into one atomic operation. No interleave possible.

---

**Why Long.compare(b, a) not Long.compare(a, b)?**

```
Long.compare(a, b) → ascending  (small first)
Long.compare(b, a) → descending (large first)
```

Subtraction works for int but overflows for long:

```
Long.MAX_VALUE - (-1) → overflow → wrong result
Long.compare()        → safe always
```

---

**Why new ArrayList(minHeap) not poll loop?**

```
poll loop           → O(k log k), destroys heap
new ArrayList(heap) → O(k) copy, heap untouched
sort after          → O(k log k) either way
```

Same complexity, copy approach is cleaner.

---

**Why getTopK() heap is local, not a class field?**

`counts` map is class-level — accumulates forever across all requests.

Heap is local — rebuilt fresh every `getTopK(k)` call because k can differ per call (`?k=5` vs `?k=10`). Temporary computation tool, not persistent state.

---

**Why eventual consistency on reads is acceptable?**

`record()` runs concurrently while `getTopK()` iterates. We don't lock the map for a consistent snapshot — that would block all ingestion. Slightly stale analytics read is the tradeoff. Prometheus and Grafana work the same way.

---

**Questions you asked that matter**

```
Q: Why min-heap not max-heap for top K?
A: Min-heap lets you evict the weakest candidate in O(log k).
   Max-heap would require draining all N elements.

Q: Why ConcurrentHashMap not HashMap?
A: HashMap corrupts under concurrent writes.
   ConcurrentHashMap uses stripe locking — fine-grained, not one big lock.

Q: Why AtomicLong not plain long?
A: Plain long increment is read → modify → write — three steps.
   Two threads can interleave and lose a count.
   AtomicLong.incrementAndGet() is one CPU instruction (CAS).

Q: What about multiple pods?
A: ConcurrentHashMap is per-JVM. Cross-pod top-K needs Redis.
   This phase solves single-JVM concurrency only.

Q: Is the PriorityQueue a class field?
A: No. Local variable inside getTopK(). Rebuilt per call.
   counts map is the class field — it's what persists.

Q: Why computeIfAbsent not containsKey + put?
A: Race condition — check-then-act. Two threads both see
   key missing, both insert, one overwrites the other.

Q: Why Long.compare not subtraction?
A: Long subtraction overflows. Long.compare uses comparison
   operators internally — safe for all values.

Q: What if k=2 and 3 numbers have same count?
A: LC #347 guarantees unique answer. In production this is
   a requirements question — do you want all tied elements
   or arbitrary selection?

Q: Why ResponseEntity<?> not List<TopKEntry>?
A: Two different return types from same method — 200 returns
   Map with results, 400 returns Map with error message.
   ResponseEntity<?> wildcard handles both.

Q: Why TopKEventTracker.TopKEntry not just TopKEntry?
A: TopKEntry is an inner record defined inside TopKEventTracker.
   Must prefix with outer class name when referencing from outside.
```

---

**Interview questions on this pattern**

```
1.  Why min-heap not max-heap for top K?
2.  What is the time complexity of your approach vs sorting?
3.  How does ConcurrentHashMap differ from HashMap internally?
4.  Why AtomicLong instead of synchronizing the method?
5.  What is a check-then-act race condition? Give an example.
6.  Your getTopK() reads stale data under concurrency — is that acceptable?
7.  What happens at k=0 or k > number of unique types?
8.  How would you handle top-K across multiple pods/JVMs?
9.  What is stripe locking?
10. Why is Long.compare safer than subtraction for comparators?
11. Your heap is rebuilt every call — how would you optimize for very frequent reads?
12. What is CAS (compare and swap)?
13. How does computeIfAbsent differ from get + put?
14. If you needed exact top-K with no staleness, how would you redesign?
15. What's the space complexity and where does it come from?
```

---

**One-line answers for quick recall**

```
Min-heap size K        →  weakest candidate always evictable in O(log k)
ConcurrentHashMap      →  stripe locking, fine-grained not one big lock
AtomicLong             →  CAS — one CPU instruction, no interleave possible
computeIfAbsent        →  atomic check+insert, no race condition
Long.compare(b,a)      →  descending, safe from overflow
local heap             →  k varies per call, no reason to persist
eventual consistency   →  analytics can be slightly stale, ingestion cannot block
cross-pod top-K        →  needs Redis, not in-memory map
```

## ⚠️ Gotcha / Watch Out


## 🔗 Related
- [[Ph03 - Top-K Tracker]]
