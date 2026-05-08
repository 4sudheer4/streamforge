---
tags:
  - gotcha
  - ph02
  - database
phase:
date: 2026-05-08
---

# Concept: Title

## 💡 What It Is

This is the brain. It's the first place in the codebase that knows about ALL the pieces — fingerprinting, deduplication, AND the database. Its job is to orchestrate them in the right order.

This is also where the `processor` lambda you've been curious about finally gets defined. The service knows what "processing" means — persist to PostgreSQL. It passes that knowledge to the engine as a function. The engine just decides whether to call it.
## 🔍 How It Works

**The flow inside EventIngestionService:**

```
1. Receive StreamEvent
2. Call deduplicationEngine.deduplicateOrProcess()
3. Pass "persist to DB" as the processor lambda
4. Engine either hits cache → returns DUPLICATE
         or misses cache → calls our lambda → persists → returns PROCESSED
5. Return EventResult to controller
```
## 🛠️ How I Used It in StreamForge


## ⚠️ Watch Out For


## 📌 Commands / Snippets
```


```

## 🔗 Related
- 
