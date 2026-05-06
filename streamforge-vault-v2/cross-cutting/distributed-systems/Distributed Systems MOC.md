# Distributed Systems MOC

> Map of Content — all distributed systems notes in one place.
> Add links here as you create notes.

---

## Kafka
- [[Idempotent Producer Config]]
- [[Kafka Topic Design]]
- [[DLQ Pattern]]

## Redis
- [[Lua Script Atomicity]]
- [[Sorted Set as Timestamp Window]]
- [[Redis Key Design]]

## Concurrency
- [[Java 21 Virtual Threads]]
- [[AtomicLong vs Synchronized]]
- [[ConcurrentHashMap TTL Eviction]]

## Patterns
- [[Cache Stampede Problem]]

---

## Key Principles I've Learned

### Atomicity
> If you need multiple operations to be atomic, push them to the server (Lua in Redis, transactions in Kafka). Client-side "atomic" sequences are not atomic under concurrency.

### Ordering
> Kafka guarantees order per partition per consumer group. The moment you have multiple partitions or multiple consumers, you lose cross-partition ordering. Design your key strategy around this.

### Backpressure
> Virtual thread executors create unlimited threads — backpressure must come from your queue. Without it, a traffic spike spawns millions of threads and the JVM runs out of memory.

---

## Add Your Own Notes
- 
