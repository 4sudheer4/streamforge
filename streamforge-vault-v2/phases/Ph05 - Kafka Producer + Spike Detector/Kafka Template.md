## Reference Notes

### What it is

java

```java
@Bean
public KafkaTemplate<String, String> kafkaTemplate() {
    return new KafkaTemplate<>(producerFactory());
}
```

`KafkaTemplate` is the bridge between your code and `ProducerFactory`. You hand it a payload, it hands it to a producer built by `ProducerFactory` with all durability rules already baked in.

Same pattern as `DataSource` vs `JdbcTemplate` — you never use `DataSource` directly, `JdbcTemplate` wraps it. Same relationship here.

---

### The only method you call

java

```java
kafkaTemplate.send(topic, key, value)
```

One line from your code. Everything else is handled internally.

---

### Your question — where does payload go? Does it go via bootstrapServers?

**No.** bootstrapServers and payload are two completely separate concerns.

```
bootstrapServers  →  "where is Kafka?" — initial contact point only
payload           →  "what am I sending?" — goes to correct broker/partition
```

```
bootstrapServers = address of the post office
payload          = the actual letter going to the recipient
```

Producer connects to bootstrapServers once to discover cluster topology. After that it talks directly to the right broker. Payload never "goes through" bootstrapServers.

---

### Your question — so KafkaTemplate is a bridge between payload and ProducerFactory?

Exactly right. You said it perfectly:

```
Your Code                 KafkaTemplate              ProducerFactory
─────────────────────────────────────────────────────────────────
kafkaTemplate             receives topic,            applies all props:
  .send(                  key, payload               - serializers
    "events",                    ↓                   - acks=all
    "payment-service",    gets producer              - idempotence
    jsonPayload)          from factory               - retries
                                 ↓                   - max.in.flight
                          sends to correct                ↓
                          broker/partition          creates producer
                                                    instance with
                                                    these rules
```

---

### Your question — so this is where the partition decision happens?

Yes. Exactly here:

java

```java
kafkaTemplate.send("events", "payment-service", jsonPayload)
```

The moment you pass `"payment-service"` as the key:

```
"payment-service"
        ↓
StringSerializer converts key to bytes
        ↓
hash(bytes) % 12
        ↓
always lands on same partition
```

**The key is everything.** Change the key, change the partition. That's why using `sourceId` as the key was a deliberate decision — it guarantees FIFO ordering per source.

---

### What happens under the hood on every send

```
kafkaTemplate.send("events", "payment-service", jsonPayload)
        ↓
KafkaTemplate gets producer from ProducerFactory
        ↓
Producer serializes key → bytes (StringSerializer)
Producer serializes value → bytes (StringSerializer)
        ↓
hash("payment-service") % 12 → partition number
        ↓
Producer routes directly to broker owning that partition
(broker address known from bootstrap metadata)
        ↓
Broker stores message in partition
        ↓
acks=all → leader + ISR followers confirm
        ↓
Returns CompletableFuture<SendResult>
```

---

### Interview one-liner

_"`KafkaTemplate` is the Spring abstraction over raw Kafka producers — you pass topic, key, and value, it manages producer lifecycle and routes the message to the correct partition via key hashing, the same way `JdbcTemplate` abstracts over raw JDBC connections."_