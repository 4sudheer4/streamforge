---
tags: [kafka, distributed, ph07]
date: 
---

# DLQ Pattern

## 💡 The Point
Dead Letter Queue — what goes there, how DefaultErrorHandler routes it, how to replay.

## 📝 Notes

## Dead Letter Queue (DLQ) Pattern

**The problem:**

A consumer reads a message from Kafka and tries to process it. Processing fails. What do you do?

Option 1 — skip it. Message is lost. Unacceptable for critical events.

Option 2 — retry forever. Consumer is stuck. All subsequent messages on that partition are blocked. One bad message takes down your entire consumer.

Option 3 — DLQ. Retry N times. If still failing, route the message to a separate topic for later inspection. Consumer moves on.

---

**How it works in StreamForge:**

```
Consumer reads from "events" topic
        ↓
Processing fails (Postgres down, null pointer, whatever)
        ↓
Spring Kafka retries 3 times (configurable backoff)
        ↓
Still failing after 3 attempts
        ↓
DeadLetterPublishingRecoverer routes message to "dlq" topic
        ↓
Consumer moves on to next message — not blocked
        ↓
Separate DLQ consumer reads "dlq" topic → logs failure with reason
```

---

**Why the DLQ topic has 1 partition:**

DLQ messages are failures. Low volume. You want them strictly ordered so you can debug them chronologically. One partition guarantees that. Multiple partitions would interleave failures from different sources making debugging harder.

---

**Spring Kafka config:**

java

```java
@Bean
public DefaultErrorHandler errorHandler(
        DeadLetterPublishingRecoverer recoverer) {
    return new DefaultErrorHandler(
        recoverer,
        new FixedBackOff(1000L, 3L)  // 1 second between retries, 3 attempts
    );
}

@Bean
public DeadLetterPublishingRecoverer recoverer(
        KafkaTemplate<String, String> template) {
    return new DeadLetterPublishingRecoverer(template,
        (record, ex) -> new TopicPartition("dlq", 0));
}
```

**`FixedBackOff(1000L, 3L)`** — wait 1 second between retries, maximum 3 attempts. After 3 failures the recoverer takes over.

**`DeadLetterPublishingRecoverer`** — Spring's built-in DLQ router. Takes the failed message and publishes it to your target topic. You specify the destination via the lambda — always partition 0 of `dlq`.

**DLQ consumer:**

java

```java
@KafkaListener(topics = "dlq", groupId = "dlq-consumer")
public void handleDlq(ConsumerRecord<String, String> record) {
    log.error("DLQ message: topic={}, key={}, value={}, offset={}",
        record.topic(), record.key(), record.value(), record.offset());
}
```

Logs every failed message with enough context to debug later. In production you'd also alert on DLQ depth — if messages are piling up something is systematically broken.

---

**Interview one-liner:** _"The DLQ pattern lets consumers skip poison pill messages after N retries by routing them to a separate topic, preventing one bad message from blocking an entire partition."_

---

**Poison pill** — worth knowing this term. A message that always fails processing no matter how many times you retry. Malformed JSON, unexpected null, schema mismatch. Without a DLQ, a poison pill permanently stalls your consumer.
## ⚠️ Gotcha / Watch Out


## 🔗 Related
- [[Ph07 - Kafka Producer + Spike Detector]]
