---
tags:
  - java
  - ph02
  - gotcha
  - code
date: 2026-05-07
phase:
---

# SHA-256 Fingerprint Logic

## 💡 The Point
How the fingerprint is computed — sourceId + type + sorted payload + 5-min time bucket.

## 📝 Notes

You can't just compare events by ID because a retry will have a different UUID. You need to hash the _content_ — sourceId + type + payload + a time bucket. If two events hash to the same value, they're the same event and one should be dropped.

**Why SHA-256?** It's collision-resistant and produces a fixed 64-char hex string you can use as a HashMap key. You're not doing cryptography here — you're doing identity, and SHA-256 is the industry-standard tool for that.

**Why the 5-minute bucket?** Without it, the same payment event retried 2 minutes later would get a different fingerprint because the timestamp differs by milliseconds. Flooring to a 5-min window collapses "same event, slight timing difference" into one fingerprint. Events more than 5 minutes apart are treated as legitimately new.

**Why TreeMap on the payload?** `{"a":1,"b":2}` and `{"b":2,"a":1}` are logically identical but serialize to different JSON strings → different SHA-256 → false miss. TreeMap sorts keys alphabetically so the JSON is always the same regardless of how the client built the map.


# CLASS:`FingerprintGenerator` / method:`generate`

## 💡 What It Is
Without fingerprinting → you process the payment twice → customer gets charged twice.

## 📝 How It Works

#### Event 1 — arrives at 10:03:47

json

```json
{
  "id": "uuid-aaa-111",
  "sourceId": "stripe-prod",
  "type": "payment.completed",
  "payload": {
    "amount": 9900,
    "currency": "USD",
    "customerId": "cust_xyz"
  },
  "timestamp": "2024-01-15T10:03:47Z"
}
```

**Step 1 — bucket the timestamp**

```
10:03:47 in epoch ms = 1705312627000

bucket = (1705312627000 / 300000) * 300000
       = 5684375 * 300000
       = 1705312500000

→ which is 10:00:00 UTC
```

So any event arriving between 10:00:00 and 10:04:59 lands in the same bucket.

**Step 2 — sort the payload**

java

```java
// Original payload came in as HashMap — key order not guaranteed
{"amount": 9900, "currency": "USD", "customerId": "cust_xyz"}

// TreeMap sorts alphabetically
{"amount": 9900, "currency": "USD", "customerId": "cust_xyz"}
// happens to be same here, but imagine:
{"customerId": "cust_xyz", "amount": 9900, "currency": "USD"}
// TreeMap fixes this → always becomes {"amount":..., "currency":..., "customerId":...}
```

**Step 3 — build the raw string**

```
"stripe-prod|payment.completed|{"amount":9900,"currency":"USD","customerId":"cust_xyz"}|1705312500000"
```

**Step 4 — SHA-256 that string**

```
→ "a3f8c2d1e9b74f6a2c8d3e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1"
```

This fingerprint goes into your `ConcurrentHashMap`. Event is processed. Payment goes through. ✅

---

#### Event 2 — Stripe retry arrives at 10:04:52 (90 seconds later)

json

```json
{
  "id": "uuid-bbb-222",       ← completely different UUID
  "sourceId": "stripe-prod",  ← same
  "type": "payment.completed", ← same
  "payload": {
    "currency": "USD",         ← same values, different key order this time
    "amount": 9900,
    "customerId": "cust_xyz"
  },
  "timestamp": "2024-01-15T10:04:52Z"  ← 90 seconds later
}
```

**Step 1 — bucket the timestamp**

```
10:04:52 in epoch ms = 1705312692000

bucket = (1705312692000 / 300000) * 300000
       = 1705312500000

→ SAME bucket: 10:00:00 UTC ✅
```

90 seconds later but still within the same 5-min window.

**Step 2 — sort the payload**

```
TreeMap → {"amount":9900,"currency":"USD","customerId":"cust_xyz"}
→ identical JSON to Event 1 ✅
```

**Step 3 — build the raw string**

```
"stripe-prod|payment.completed|{"amount":9900,"currency":"USD","customerId":"cust_xyz"}|1705312500000"
```

**Exact same string as Event 1.**

**Step 4 — SHA-256**

```
→ "a3f8c2d1e9b74f6a2c8d3e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1"
```

**Exact same fingerprint.** Cache hit. Return `DUPLICATE`. Payment NOT processed again. ✅

---

#### Now the edge case — what if the retry comes 6 minutes later?

Event arrives at **10:07:15**.

```
bucket = (1705312835000 / 300000) * 300000
       = 1705312500000... wait let me be precise

10:07:15 epoch = 1705312835000
1705312835000 / 300000 = 5684376.1...
floor → 5684376
5684376 * 300000 = 1705312800000

→ which is 10:05:00 UTC  ← DIFFERENT bucket
```

Different bucket → different raw string → different SHA-256 → **cache miss → event gets processed as new.**

This is intentional. A retry 6 minutes later is far enough apart that you can't be sure it's a duplicate vs a legitimately new payment. The 5-minute window is a business decision, not a technical one — you could make it 15 minutes or 1 hour by changing `WINDOW_MS`.

---



This code in task one is only till step-4, which is sha-256 generation right? doesn't cover cache hit, return duplicate yet.


## 🔍 Field / Parameter Breakdown

| Name | Type | Job |
|------|------|-----|
|  |  |  |

## 🤔 Why This Design
A payment service fires a webhook. Your network hiccups. Stripe retries it 90 seconds later. Both hits reach your `/api/v1/events` endpoint. They have **different UUIDs** (Stripe generates a new one per attempt) but **identical content**.

**Tradeoff:**

## ⚠️ Gotcha

**The key insight for interviews:** You're trading false positive risk (treating a new event as duplicate) against false negative risk (processing the same event twice). The window size controls that tradeoff. A senior engineer would ask "what's the retry window on your upstream systems?" before picking the number. That question alone shows system design maturity.

## 🔗 Related
- [[Ph03 - Fingerprint + Dedup]]
