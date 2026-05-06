---
tags: [java, ph01]
date: 
---

# `StreamEvent Record`

## 💡 What It Is
`StreamEvent` is a Java record — an immutable data container. Core event object that flows through the entire system.

## 📝 How It Works
```java
public record StreamEvent(
    UUID id,
    String sourceId,
    String type,
    Map<String, Object> payload,
    Instant timestamp,
    String fingerprint
) {}
```

## 🔍 Field / Parameter Breakdown
| Field | Type | Job |
|-------|------|-----|
| `id` | `UUID` | Unique identifier for this event instance |
| `sourceId` | `String` | Which client/service sent it → rate limit key in [[Ph06 - Redis Rate Limiter]] |
| `type` | `String` | Event kind e.g. "payment" → top-K tracking in [[Ph05 - Top-K Tracker]] |
| `payload` | `Map<String,Object>` | Actual event data — flexible shape fits any upstream |
| `timestamp` | `Instant` | When it happened → 5-min fingerprint window in [[Ph03 - Fingerprint + Dedup]] |
| `fingerprint` | `String` | SHA-256 hash → duplicate detection in [[Ph03 - Fingerprint + Dedup]] |

## 🤔 Why This Design
**Why `record` not `class`:** Records are immutable [[Mutable Immutable data structures]] by default — no setters, no boilerplate. An event that enters the system should never be mutated after creation. Immutability also makes it safe to pass across threads without synchronization.

**Why `Map<String,Object>` for payload:** Strict typing would require a subclass per event type — unmaintainable at scale. The tradeoff is losing compile-time safety on payload fields.

## ⚠️ Gotcha
Serializing `Map<String,Object>` to JSON with Jackson works fine but deserializing back loses type info — numbers come back as `Integer` not `Long`. Be explicit about type casting when reading payload values.

## 🔗 Related
- [[Ph01 - Spring Boot Skeleton]]
