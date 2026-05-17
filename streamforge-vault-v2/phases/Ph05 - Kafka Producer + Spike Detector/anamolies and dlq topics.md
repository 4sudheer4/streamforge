**anomaliesTopic:**

```java
@Bean
public NewTopic anomaliesTopic() {
    return TopicBuilder.name("anomalies").partitions(3).replicas(1).build();
}
```

This is where `SpikeDetector` publishes when it detects abnormal traffic.

**Who writes to it:** SpikeDetector — when `currentRate > 3x rollingAvg`

**Who reads from it:** Future alerting service — PagerDuty, Slack alerts, on-call engineer notifications.

**Why 3 partitions:**

```
Normal traffic:    1000 events/min → maybe 5 spikes/min
Spike events are rare by definition
3 partitions handles that volume comfortably

If you gave it 12 partitions like "events":
  9 partitions would sit empty forever
  Wasted resources
```

**Key design:** `sourceId` — so all spikes from `payment-service` land on the same partition in order. Alerting service sees them chronologically per source.

---

**dlqTopic:**

```java
@Bean
public NewTopic dlqTopic() {
    return TopicBuilder.name("dlq").partitions(1).replicas(1).build();
}
```

This is your failure morgue. Every message that failed processing after 3 retries lands here.

**Who writes to it:** `DeadLetterPublishingRecoverer` — automatically after 3 failed retries

**Who reads from it:** Your DLQ consumer — logs failures with full context for debugging

**Why 1 partition:**

```
Failures are rare — maybe 0.1% of traffic
Low volume → 1 partition is enough

More importantly: single partition = strict chronological order

With 3 partitions:
  failure from payment-service → partition 1
  failure from auth-service    → partition 0
  failure from payment-service → partition 2
  
  Interleaved. Hard to reconstruct what happened when.

With 1 partition:
  failure 1 → failure 2 → failure 3 → failure 4
  
  Perfect timeline. Easy to debug.
```

**The DLQ is your safety net:**

```
Without DLQ:
  Bad message arrives
  Consumer fails
  Retries forever
  Entire partition blocked
  All subsequent messages stuck

With DLQ:
  Bad message arrives
  Consumer fails
  Retries 3x
  Routes to DLQ
  Consumer moves on
  Rest of partition unblocked
```

---

**Comparing all three topics:**

```
Topic       Volume    Partitions  Why
────────────────────────────────────────────────────
events      high      12          scale + ordering
anomalies   low       3           enough for spike rate
dlq         very low  1           chronological debugging
```

---

**Interview one-liner:** _"DLQ partition count is 1 deliberately — low volume failure messages need strict chronological ordering for debugging, and multiple partitions would interleave failures making root cause analysis harder."_

---