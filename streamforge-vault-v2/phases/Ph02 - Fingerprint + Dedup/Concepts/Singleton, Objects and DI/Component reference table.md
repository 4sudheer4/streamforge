**Order rule: traveler born → stateless workers pass it → stateful memory checked → traveler dies**
[[Where in the code are we creating new object per request?]]
---

| Order | Component                     | Type            | Code                                                                       | What happens                           |
| ----- | ----------------------------- | --------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| 1     | `EventController`             | Stateless       | `@PostMapping ingest(@RequestBody StreamEvent event)`                      | HTTP request arrives, journey begins   |
| 2     | `StreamEvent`                 | Traveler born   | `@RequestBody StreamEvent event`                                           | Raw JSON becomes Java object           |
| 3     | `EventIngestionService`       | Stateless       | `deduplicationEngine.deduplicateOrProcess(event, this::persistToDatabase)` | Hands event + processor to engine      |
| 4     | `FingerprintGenerator`        | Stateless       | `return HexFormat.of().formatHex(hash)`                                    | Computes SHA-256 identity of event     |
| 5     | `DeduplicationEngine`         | Stateful        | `cache.get(fingerprint)`                                                   | Checks memory — seen this before?      |
| 6a    | `DeduplicationEntry`          | Traveler→Stored | `cache.put(fingerprint, new DeduplicationEntry(...))`                      | Cache miss → store in memory           |
| 6b    | `DeduplicationEntry`          | Retrieved       | `existing.isExpired()`                                                     | Cache hit → pull from memory           |
| 7     | `EventResult`                 | Traveler born   | `new EventResult(..., "PROCESSED/DUPLICATE", ...)`                         | Result created carrying outcome        |
| 8     | `EventController`             | Stateless       | `ResponseEntity.status(statusCode).body(result)`                           | HTTP response sent back                |
| 9     | `StreamEvent` + `EventResult` | Traveler dies   | —                                                                          | GC collects them, cache entry survives |

---

**One line summary of the order:**

```
Door opens → 
  Traveler born → 
    Workers pass it along → 
      Memory consulted → 
        New traveler born with answer → 
          Door closes → 
            Travelers die, memory lives on
```

