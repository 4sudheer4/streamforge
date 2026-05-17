---
tags: [code]
phase: 
date: 2026-05-17
---

# `KafkaConfig` / `ProducerFactory`

## 💡 What It Is
*One line — what is this and its role in the system.*

## 📝 How It Works

```java
// com/streamforge/config/KafkaConfig.java

@Configuration

public class KafkaConfig {

  

@Value("${spring.kafka.bootstrap-servers}")

private String bootstrapServers;

```

**What it does:**
`@Value` pulls a value from `application.yml` and injects it into this field at startup.

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
```

So `bootstrapServers` = `"localhost:9092"` at runtime.

---
**Why not hardcode it?**

```java
// bad
private String bootstrapServers = "localhost:9092";
```

In local dev your Kafka is at `localhost:9092`. In production it's at something like `kafka.yourcompany.internal:9092`.

If you hardcode it, you have to change the code for every environment. With `@Value` you just change the config file or environment variable. Code stays the same everywhere.

---
**Why bootstrap specifically?**

"Bootstrap" means initial contact point. You give the producer one broker address to connect to. That broker tells the producer where all the other brokers and partitions are. After that the producer talks directly to the right broker for each partition.

You don't need to list all 12 brokers. Just one entry point.

**Producer to broker flow:**

```
Producer starts
        ↓
Connects to bootstrap broker (localhost:9092)
        ↓
Broker returns cluster metadata:
  "Partition 0 leader = Broker 1"
  "Partition 4 leader = Broker 2"
  "Partition 7 leader = Broker 3"
  etc.
        ↓
Producer caches this metadata
        ↓
sourceId="payment-service" → hash → Partition 4
Producer talks DIRECTLY to Broker 2 (leader of Partition 4)
No middleman
```

---

```
Broker 1 — leader for Partition 0, 1, 2, 3
Broker 2 — leader for Partition 4, 5, 6, 7
Broker 3 — leader for Partition 8, 9, 10, 11

AND

Broker 1 — follower (replica) for Partition 4, 5, 8, 9
Broker 2 — follower (replica) for Partition 0, 1, 8, 9
Broker 3 — follower (replica) for Partition 0, 1, 4, 5
```
One broker wears multiple hats — leader for some partitions, follower for others.

---
**Interview one-liner:** _"Bootstrap servers are the initial contact point — the producer connects to one broker to discover the full cluster topology, then routes directly to partition leaders."

--------

```java

@Bean

public ProducerFactory<String, String> producerFactory() {

Map<String, Object> props = new HashMap<>();

props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);

props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

props.put(ProducerConfig.ACKS_CONFIG, "all");

props.put(ProducerConfig.RETRIES_CONFIG, 3);

props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

return new DefaultKafkaProducerFactory<>(props);

}

```

**VALUE_SERIALIZER_CLASS_CONFIG:

```
Step 1 — Your code:
  ObjectMapper.writeValueAsString(event) 
  StreamEvent → JSON String
  (you do this manually)

Step 2 — StringSerializer:
  JSON String → bytes
  (VALUE_SERIALIZER does this automatically)
```

**Kafka only speaks bytes over the wire.** It never sees Strings or objects. Everything must become bytes before leaving your JVM.

So `VALUE_SERIALIZER_CLASS_CONFIG = StringSerializer` is responsible for that final conversion:

```
Your code          StringSerializer       Kafka broker
────────────────────────────────────────────────────
JSON String    →   bytes             →    stored in partition
"{id:123...}"      [74, 115, 111...]      ✅
```

---

**ENABLE_IDEMPOTENCE — sequence numbers:**

Not per source type. Per **producer session per partition**.

```
Producer P-001 sending to Partition 4:
  event 1 → sequence 1
  event 2 → sequence 2
  event 3 → sequence 3  ← network drops
  event 3 retry → sequence 3 again  ← same, not new
```

Sequence number is per producer instance, increments by 1 for each new message. Same message always retries with the **same** sequence number. That's the whole point.

---

**ACKS=all — not fire and forget:**

Exactly right. It's the opposite of fire and forget.

```
acks=0  → fire and forget (don't wait for anyone)
acks=1  → wait for leader only
acks=all → wait for leader + all ISR followers
```

Slow but durable. Leader confirms AND every in-sync replica confirms before producer gets the green light.

---

**RETRIES=3 — same sequence number, not new:**

This is the critical correction. **Same sequence number on retry.**

```
Retry with NEW sequence → Kafka thinks it's a new message → stores it → DUPLICATE
Retry with SAME sequence → Kafka recognizes it → drops it → NO DUPLICATE
```

That's exactly why idempotence and retries work together. Retries are only safe **because** the sequence number stays the same.

---

**MAX_IN_FLIGHT=5:**

This one needs a full explanation.

"In flight" means sent but not yet acknowledged by Kafka.

```
Producer sends message 1 → waiting for ACK
Producer sends message 2 → waiting for ACK
Producer sends message 3 → waiting for ACK
  (3 messages in flight simultaneously)
```

`MAX_IN_FLIGHT=5` means maximum 5 unacknowledged messages at once.

**Why 5 specifically for idempotence?**

Imagine 6 messages in flight. Message 3 fails and retries. But messages 4, 5, 6 already arrived at Kafka. Now message 3 retry arrives after 4, 5, 6.

```
Kafka received: 1, 2, 4, 5, 6, 3(retry)
Expected order: 1, 2, 3, 4, 5, 6
```

Sequence numbers are out of order. Kafka's idempotence tracking breaks down.

Kafka engineers proved mathematically that with **≤5 in-flight requests**, ordering is guaranteed even during retries. Above 5 it cannot be guaranteed.

So 5 is not arbitrary — it's a hard constraint of the protocol.

```
MAX_IN_FLIGHT > 5 + idempotence = ordering not guaranteed
MAX_IN_FLIGHT ≤ 5 + idempotence = ordering guaranteed
```

---

**Interview one-liner:** _"MAX_IN_FLIGHT=5 is a Kafka protocol constraint — with more than 5 unacknowledged requests, out-of-order retries can break the sequence number tracking that idempotence relies on."_

---
[[Kafka Template]] [[anamolies and dlq topics]]
```java
@Bean

public KafkaTemplate<String, String> kafkaTemplate() {

return new KafkaTemplate<>(producerFactory());

}

  

@Bean

public NewTopic eventsTopic() {

return TopicBuilder.name("events").partitions(12).replicas(1).build();

}

  

@Bean

public NewTopic anomaliesTopic() {

return TopicBuilder.name("anomalies").partitions(3).replicas(1).build();

}

  

@Bean

public NewTopic dlqTopic() {

return TopicBuilder.name("dlq").partitions(1).replicas(1).build();

}

}
```

## 🔍 Field / Parameter Breakdown

| Name | Type | Job |
|------|------|-----|
|  |  |  |

## 🤔 Why This Design
**Why X not Y:**

**Tradeoff:**

## ⚠️ Gotcha


## 🔗 Related
- 
