
---

#### 1. `ConcurrentHashMap` — DeduplicationEngine

**Declaration:**

java

```java
private final ConcurrentHashMap<String, DeduplicationEntry> cache = new ConcurrentHashMap<>();
```

**Important variables:**

java

```java
String key        // the fingerprint — "a3f8c2..."
DeduplicationEntry value  // the cached result with TTL metadata
int before        // snapshot of cache size before eviction
int evicted       // how many entries were removed
Duration ttl      // how long entries live — default 30 min
```

**Example state after 3 events:**

```
cache = {
  "a3f8c2..." → DeduplicationEntry(
                    fingerprint: "a3f8c2...",
                    result: EventResult(id=uuid-111, status="PROCESSED"),
                    createdAt: 10:03:47,
                    expiresAt: 10:33:47
                ),
  "b4e9d1..." → DeduplicationEntry(
                    fingerprint: "b4e9d1...",
                    result: EventResult(id=uuid-222, status="PROCESSED"),
                    createdAt: 10:05:00,
                    expiresAt: 10:35:00
                ),
  "c7f2a8..." → DeduplicationEntry(...)
}
```

---

#### 2. `TreeMap` — FingerprintGenerator

**Declaration:**

java

```java
var sortedPayload = new TreeMap<>(event.payload());
```

**Important variables:**

java

```java
long bucket       // floored timestamp — 1705312500000 (10:00:00)
String payloadJson // sorted JSON string — '{"amount":9900,"currency":"USD"}'
String raw        // full string before hashing — "stripe-prod|payment.completed|{...}|1705312500000"
byte[] hash       // SHA-256 output — raw bytes
String fingerprint // final 64-char hex — "a3f8c2d1e9b74f6a..."
```

**Example:**

```java
// Input HashMap — random order
{"currency": "USD", "amount": 9900, "customerId": "cust_xyz"}

// TreeMap — alphabetical
{"amount": 9900, "currency": "USD", "customerId": "cust_xyz"}

// raw string built from sorted payload
"stripe-prod|payment.completed|{"amount":9900,"currency":"USD","customerId":"cust_xyz"}|1705312500000"

// SHA-256 of raw string
"a3f8c2d1e9b74f6a2c8d3e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1"
```

---

#### 3. `Map<String, Object>` — StreamEvent payload

**Declaration:**

java

```java
Map<String, Object> payload  // field inside StreamEvent record
```

**Important variables:**

java

```java
String key    // field name  — "amount", "currency", "customerId"
Object value  // field value — 9900 (Integer), "USD" (String), true (Boolean)
```

**Example:**

java

```java
// payment event payload
{
  "amount"     → 9900        (Integer)
  "currency"   → "USD"       (String)
  "customerId" → "cust_xyz"  (String)
}

// login event payload — completely different shape, same Map type
{
  "userId"    → "u_123"       (String)
  "ipAddress" → "192.168.1.1" (String)
  "mobile"    → true          (Boolean)
}
```

---

#### 4. Records — Domain Objects

**Declarations:**

java

```java
public record StreamEvent(
    UUID id,                     // "uuid-aaa-111"
    String sourceId,             // "stripe-prod"
    String type,                 // "payment.completed"
    Map<String, Object> payload, // {"amount": 9900, ...}
    Instant timestamp,           // 2024-01-15T10:03:47Z
    String fingerprint           // null on arrival, set after generation
)

public record EventResult(
    UUID eventId,       // "uuid-aaa-111" — original event ID
    String status,      // "PROCESSED" or "DUPLICATE"
    String fingerprint, // "a3f8c2..."
    boolean deduplicated // false or true
)

public record DeduplicationEntry(
    String fingerprint,  // "a3f8c2..." — the cache key
    EventResult result,  // full result stored at cache time
    Instant createdAt,   // 2024-01-15T10:03:47Z
    Instant expiresAt    // 2024-01-15T10:33:47Z — createdAt + 30min
)
```

---

#### 5. `Function<StreamEvent, EventResult>` — processor lambda

**Declaration:**

java

```java
Function<StreamEvent, EventResult> processor
```

**Important variables:**

java

```java
StreamEvent input   // the event passed to the function
EventResult output  // what the function returns after DB save
```

**Example:**

java

```java
// what EventIngestionService passes
this::persistToDatabase

// what it looks like expanded
Function<StreamEvent, EventResult> processor = (event) -> {
    StreamEventEntity entity = new StreamEventEntity(
        UUID.randomUUID(),  // new UUID
        event.sourceId(),   // "stripe-prod"
        event.type(),       // "payment.completed"
        event.payload(),    // {"amount": 9900, ...}
        event.timestamp(),  // 2024-01-15T10:03:47Z
        event.fingerprint() // "a3f8c2..."
    );
    repository.save(entity);
    return new EventResult(entity.getId(), "PROCESSED", event.fingerprint(), false);
};
```

---

### Full Picture — How They Connect

```
POST /api/v1/events
{                                    ← raw JSON from client
  "id": "uuid-aaa-111",
  "sourceId": "stripe-prod",
  "type": "payment.completed",
  "payload": {"amount": 9900, "currency": "USD"},
  "timestamp": "2024-01-15T10:03:47Z"
}
         ↓
StreamEvent record                   ← @RequestBody deserializes JSON
{
  id: uuid-aaa-111
  sourceId: "stripe-prod"
  type: "payment.completed"
  payload: HashMap{"amount"→9900, "currency"→"USD"}
  timestamp: Instant(10:03:47)
  fingerprint: null                  ← not set yet
}
         ↓
TreeMap sorts payload                ← FingerprintGenerator
{"amount"→9900, "currency"→"USD"}   ← already sorted here, but guaranteed

raw = "stripe-prod|payment.completed|{"amount":9900,"currency":"USD"}|1705312500000"
fingerprint = "a3f8c2..."            ← SHA-256 of raw
         ↓
ConcurrentHashMap lookup             ← DeduplicationEngine
cache.get("a3f8c2...")
         ↓ null                      ↓ DeduplicationEntry
    cache miss                      cache hit
         ↓                               ↓
processor.apply(event)          return EventResult(
    → save to DB                    eventId: uuid-aaa-111,
    → return EventResult(           status: "DUPLICATE",
        status: "PROCESSED"         deduplicated: true
      )                         )
         ↓                               ↓
ResponseEntity(200, result)     ResponseEntity(208, result)
```