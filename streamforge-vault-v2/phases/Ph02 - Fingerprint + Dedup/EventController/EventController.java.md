---
tags:
  - code
  - ph02
  - java
phase:
date: 2026-05-09
---

# `ClassName` / `methodName`

## 💡 What It Is

The controller is the thinnest layer in the system. Its only job is:

- Receive HTTP request
- Parse JSON into `StreamEvent`
- Hand to service
- Return correct HTTP response code

## 📝 How It Works

java

```java
// src/main/java/com/streamforge/api/EventController.java
package com.streamforge.api;

import com.streamforge.domain.EventResult;
import com.streamforge.domain.StreamEvent;
import com.streamforge.engine.EventIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventIngestionService ingestionService;

    @PostMapping
    public ResponseEntity<EventResult> ingest(@RequestBody StreamEvent event) {
        log.info("Received event type={} sourceId={}", event.type(), event.sourceId());

        EventResult result = ingestionService.ingest(event);

        // 200 for new events, 208 for duplicates
        int statusCode = result.deduplicated() ? 208 : 200;
        return ResponseEntity.status(statusCode).body(result);
    }
}
```

---

**Why `ResponseEntity<EventResult>`?**

Gives you full control over the HTTP response — status code, headers, body. If you just returned `EventResult` directly Spring would always send 200. You need 208 for duplicates so `ResponseEntity` is necessary.

---

**The annotations:**

java

```java
@RestController   
// = @Controller + @ResponseBody
// every method automatically serializes return value to JSON
// no need to write objectMapper.writeValueAsString() yourself

@RequestMapping("/api/v1/events")   
// base path for all methods in this controller

@PostMapping      
// maps HTTP POST to this method
// full path = /api/v1/events

@RequestBody      
// "deserialize the JSON request body into StreamEvent"
// Spring uses Jackson automatically
```

---

**The full HTTP flow:**

```
POST /api/v1/events
Content-Type: application/json

{
  "id": "uuid-aaa-111",
  "sourceId": "stripe-prod",
  "type": "payment.completed",
  "payload": {"amount": 9900, "currency": "USD"},
  "timestamp": "2024-01-15T10:03:47Z"
}

↓ Spring deserializes JSON → StreamEvent record
↓ controller calls ingestionService.ingest(event)
↓ engine checks cache
↓ hit or miss

← 200 + EventResult(status="PROCESSED")   // new event
← 208 + EventResult(status="DUPLICATE")   // duplicate
```

---

**Interview angle.**

Thin controllers are a strong signal of good architecture. If an interviewer sees business logic in a controller — red flag. The rule is: controller knows HTTP, service knows business logic, repository knows data. Each layer speaks only its own language.

---



```
This line return ResponseEntity.status(statusCode).body(result) explanation
```


An HTTP response has three parts:

```
1. Status code  → 200, 208, 404, 500 etc
2. Headers      → Content-Type, X-RateLimit etc
3. Body         → the actual JSON data
```

`ResponseEntity` is Spring's way of letting you control all three. This one line is building and returning the complete HTTP response.

---

**Breaking it down piece by piece:**

java

```java
ResponseEntity
// Spring's wrapper class that represents a FULL HTTP response
// without it you can only return the body — status is always 200
```

java

```java
.status(statusCode)
// sets the HTTP status code
// statusCode is either 200 or 208 depending on result.deduplicated()
// returns a "builder" — not the final response yet, just started building
```

java

```java
.body(result)
// sets the response body
// result is your EventResult record
// Spring automatically serializes it to JSON using Jackson
// THIS finalizes the builder and returns the ResponseEntity
```

---

**What the client actually receives:**

**New event — cache miss:**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "eventId": "uuid-aaa-111",
  "status": "PROCESSED",
  "fingerprint": "a3f8c2...",
  "deduplicated": false
}
```

**Duplicate event — cache hit:**

```
HTTP/1.1 208 Already Reported
Content-Type: application/json

{
  "eventId": "uuid-aaa-111",
  "status": "DUPLICATE",
  "fingerprint": "a3f8c2...",
  "deduplicated": true
}
```

---

**The builder pattern explained.**

This is called a **fluent builder** — each method returns the same object so you can chain calls:

java

```java
// broken down step by step
BodyBuilder builder = ResponseEntity.status(statusCode); // step 1 — set status
ResponseEntity<EventResult> response = builder.body(result); // step 2 — set body
return response;

// chained — same thing, one line
return ResponseEntity.status(statusCode).body(result);
```

You'll see this pattern everywhere in Java — StringBuilder, stream operations, JPA queries. Learn to recognize it.

---

**Why not just return `result` directly?**

java

```java
// option 1 — just return the object
public EventResult ingest(@RequestBody StreamEvent event) {
    return ingestionService.ingest(event);
    // Spring always sends 200 — you can't control the status code
}

// option 2 — ResponseEntity gives full control
public ResponseEntity<EventResult> ingest(@RequestBody StreamEvent event) {
    return ResponseEntity.status(statusCode).body(result);
    // 200 for new, 208 for duplicate — client knows exactly what happened
}
```

Option 1 works but client can never tell if the event was new or duplicate — everything looks like success. Option 2 gives the client meaningful information through the status code.

---

**Interview angle.**

Using semantically correct HTTP status codes is a signal of API design maturity. A junior engineer returns 200 for everything. A senior engineer knows 208 exists and uses it correctly. When an interviewer asks "how does the client know if their event was a duplicate?" — `208 Already Reported` is a complete, precise answer.

  

Sonnet 4.6
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
