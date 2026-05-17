---
tags:
  - kafka
  - distributed
  - ph05
date:
---

# Kafka Topic Design

## 💡 The Point
Why events=12 partitions, anomalies=3, dlq=1 — partition count drives parallelism.

## 📝 Notes

## Kafka Topic Design

**What a topic is:**

A topic is a named, append-only log. You write messages to it, consumers read from it. Messages are never deleted on read — they sit there until a configurable retention period expires (default 7 days). Multiple consumers can read the same topic independently without affecting each other.

```
Topic: "events"
─────────────────────────────────────────
[event1] → [event2] → [event3] → [event4]  ← append only
     ↑                                ↑
consumer A                      consumer B
(reads from offset 0)           (reads from offset 2)
```

Both consumers read independently. Consumer B being slow doesn't affect Consumer A.

---

**Partitions:**

A topic is split into N parallel lanes called partitions. Each partition is its own independent append-only log.

```
Topic: "events" (12 partitions)
─────────────────────────────────
Partition 0:  [e1] → [e3] → [e7]
Partition 1:  [e2] → [e5] → [e9]
Partition 2:  [e4] → [e6] → [e8]
...
Partition 11: [e10] → [e11]
```

Why partitions exist:

**Parallelism** — one consumer can only read so fast. With 12 partitions you can have 12 consumers reading simultaneously, each owning one partition. Throughput scales linearly.

**Ordering** — within a single partition, messages are strictly ordered. Across partitions, no ordering guarantee. This is why key design matters.

---

**How messages are assigned to partitions:**

When a producer sends a message with a key, Kafka runs:

```
partition = hash(key) % numPartitions
```

Same key always produces same partition. No randomness.

```
sourceId="payment-service"  → hash=84729  → 84729 % 12 = 4  → Partition 4
sourceId="auth-service"     → hash=29471  → 29471 % 12 = 7  → Partition 7
sourceId="payment-service"  → hash=84729  → 84729 % 12 = 4  → Partition 4 (always)
```

All events from `payment-service` land on Partition 4, in the order they arrived. A consumer reading Partition 4 sees them in FIFO order. This is how you guarantee ordering per source.

Without a key, Kafka round-robins across all partitions:

```
event 1 → Partition 3
event 2 → Partition 7
event 3 → Partition 1
```

Order is gone. Never use null keys when ordering matters.

---

**Brokers:**

A broker is a single Kafka server — one JVM process, one machine. A Kafka cluster is multiple brokers.

```
Kafka Cluster
├── Broker 1  (server 1)
├── Broker 2  (server 2)
└── Broker 3  (server 3)
```

Partitions are distributed across brokers. With 12 partitions and 3 brokers, each broker owns roughly 4 partitions. This spreads the load.

```
Broker 1: Partition 0, 1, 2, 3
Broker 2: Partition 4, 5, 6, 7
Broker 3: Partition 8, 9, 10, 11
```

Producers and consumers connect to any broker. Kafka internally routes them to the correct broker for each partition.

---

**Replicas:**

A replica is a copy of a partition on a different broker. Replication factor = how many copies exist total.

```
Topic: "events", replication factor 3

Partition 0:
  Broker 1 → LEADER   (handles reads and writes)
  Broker 2 → FOLLOWER (copies everything from leader)
  Broker 3 → FOLLOWER (copies everything from leader)
```

**Leader** — the one broker that handles all reads and writes for that partition. Only one leader per partition at any time.

**Follower** — passively replicates. Does nothing else. Just stays in sync with the leader.

**ISR (In-Sync Replica)** — followers that are fully caught up with the leader. Kafka tracks this list. If a follower falls too far behind it's removed from ISR.

**Leader election** — if the leader broker crashes, Kafka automatically promotes an ISR follower to leader. Usually takes seconds. Zero data loss because the new leader was fully in sync.

```
Broker 1 crashes (was leader for Partition 0)
        ↓
Kafka promotes Broker 2 → new leader
        ↓
Producers and consumers now talk to Broker 2
        ↓
No data lost — Broker 2 had everything
```

**Why `replicas(1)` in your Docker Compose:**

You have one broker container. Setting replicas > 1 means Kafka tries to place a second copy on a second broker that doesn't exist. The topic goes under-replicated and may refuse writes. In production: always 3 brokers, replication factor 3.

---

**Topic design for StreamForge:**

```
Topic       Partitions  Replicas  Why
─────────────────────────────────────────────────────────────────
events      12          1         High volume. 12 partitions = 
                                  12 parallel consumers later.
                                  sourceId key = ordering per source.

anomalies   3           1         Lower volume. Only spike events.
                                  3 partitions is enough.

dlq         1           1         Failed messages only. Low volume.
                                  Single partition keeps them ordered
                                  for debugging.
```
## ⚠️ Gotcha / Watch Out


## 🔗 Related
- [[Ph07 - Kafka Producer + Spike Detector]]
