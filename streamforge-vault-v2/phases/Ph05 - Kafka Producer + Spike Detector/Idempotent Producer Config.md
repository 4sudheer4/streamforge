---
tags:
  - kafka
  - distributed
  - ph05
date:
---

# Idempotent Producer Config

## 💡 The Point
Why idempotence=true requires acks=all + retries + max.in.flight — the coupled config trap.

## 📝 Notes

## Idempotent Producer Config

**The problem without idempotence:**

```
Producer sends message (sequence unknown)
Network drops after Kafka receives but before ACK sent back
Producer times out → retries
Kafka has no way to detect duplicate → stores message twice
```

Two identical events in your topic. Downstream consumers process the same event twice.

**How idempotence solves it:**

Kafka assigns each producer session a unique **Producer ID (PID)**. The producer assigns each message a **sequence number** that increments by 1 per partition.

```
Producer P-001 sends to Partition 4:
  message 1 → sequence 45
  message 2 → sequence 46
  message 3 → sequence 47  ← network drops here
  
Producer retries message 3 → sequence 47 again
Kafka: "I already stored seq 47 from P-001 on Partition 4" → drops it
```

Sequence numbers are deterministic. Same message always retries with the same sequence. Kafka deduplicates on the broker side.

**The full config and why each setting exists:**

java

```java
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, 3);
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
```

**`enable.idempotence=true`** — activates PID assignment and sequence number tracking. Without this, retries can duplicate.

**`acks=all`** — producer waits for leader and all ISR followers to confirm before considering the write successful. Required by the idempotence protocol. Also gives you durability — message survives a leader crash.

**`retries=3`** — how many times the producer retries on failure before giving up. With idempotence enabled, retries are safe — no duplicates.

**`max.in.flight.requests.per.connection=5`** — how many unacknowledged requests can be in-flight simultaneously. Kafka's idempotence protocol requires this to be ≤ 5 to guarantee ordering during retries. This is a spec constraint, not arbitrary.

These four settings are a package. They work together. Missing one breaks the guarantee:

```
idempotence=true + acks=1     → not fully durable
idempotence=true + inflight=6 → ordering not guaranteed
acks=all + no idempotence     → durable but still can duplicate on retry
```
## ⚠️ Gotcha / Watch Out


## 🔗 Related
- [[Ph07 - Kafka Producer + Spike Detector]]
