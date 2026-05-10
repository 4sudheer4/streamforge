The controller is the thinnest layer in the system. Its only job is:

- Receive HTTP request
- Parse JSON into `StreamEvent`
- Hand to service
- Return correct HTTP response code

That's it. No business logic. No DB knowledge. No dedup knowledge. Just HTTP in, result out.

**Why 200 vs 208?**

```
200 OK               → event was new, processed successfully
208 Already Reported → event was duplicate, already processed before
```

208 is an official HTTP status code meaning "this resource was already reported in a previous request." Perfect semantic fit for deduplication. Client knows their event was received — just not processed again.

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

**Interview angle.**

Thin controllers are a strong signal of good architecture. If an interviewer sees business logic in a controller — red flag. The rule is: controller knows HTTP, service knows business logic, repository knows data. Each layer speaks only its own language.