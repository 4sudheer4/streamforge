**W2D1 + W2D2 — Notes, Interview Questions, Gotchas**

---

**Core Concepts**

**HTTP Headers vs Request Body**

- Headers → infrastructure metadata. Rate limiting, auth, content-type, tracing. Read by filters, proxies, Nginx. Never business logic.
- Body → business data. Your domain objects. Read by controllers and services.
- Rule: if Nginx needs to read it → header. If only your app needs it → body.

**Redis roles — what it is and isn't**

- Not a page cache. Not a load balancer.
- In-memory data store — strings, lists, sorted sets, hashes, streams
- Here: shared state store for rate limit counters across all app instances
- Passive — never pushes. Only responds when asked.

**Why Redis over in-memory for rate limiting**

- 3 app instances + in-memory counter = 300 effective limit
- Redis = one sorted set, all instances share it = true 100 limit
- In-memory rate limiting breaks the moment you scale horizontally

**Fixed Window vs Sliding Window**

- Fixed window exploit: send 100 at 11:59:59, 100 at 12:00:00 = 200 in 2 seconds
- Sliding window: window is always `now - 60s`. No fixed boundary. No reset cliff.
- 100 requests at 12:00:59 → at 12:01:00 window still sees all 100 → denied

**Lua Atomicity**

- ZADD + ZREMRANGEBYSCORE + ZCOUNT = 3 separate commands
- Without atomicity: two concurrent requests both read 99, both proceed = 101 allowed
- Lua runs as single atomic operation inside Redis. No interleaving possible.
- Lua returns raw count. Java makes allow/deny decision. Single responsibility.

**Filter vs HandlerInterceptor**

- Filter = Servlet layer. Runs before Spring MVC wakes up.
- HandlerInterceptor = Spring MVC layer. Runs after controller is resolved.
- Rate limiting belongs in Filter — reject before Spring does any work. Fail fast.

**`@PostConstruct` vs `new`**

- `@PostConstruct` only fires when Spring manages the object
- `new` keyword bypasses Spring entirely — `@PostConstruct` never runs
- Why mocking works: mock replaces entire `redisTemplate` object. Arguments passed to `execute()` are ignored. Lua script never loads, never runs.

**Records as data carriers**

- Immutable per instance. New instance created per request.
- `RateLimitResult(allowed, remaining)` — named tuple passing data between layers
- Same pattern as `StreamEvent` passed between `FingerprintGenerator` and `DeduplicationEngine`
- Public record = return type of public method. Compiler warns if return type is less visible than method.

**`Math.max(0, limit - count)`**

- 101st request: count=101, limit=100, `100-101 = -1`
- Never expose negative remaining to client — meaningless and leaks internal state
- Floor at 0. Client sees "0 remaining" — clean signal.

**400 vs 429**

- 429 = you're allowed but exceeded limit. Slow down.
- 400 = malformed request. Fix your request.
- Missing `X-Source-Id` = we don't know who you are = 400, not 429.
- Always use the most accurate error code. Each code tells the client something different.

---

**FAANG Interview Questions**

1. "Design a rate limiter for a distributed system with 10 app instances."
    - Expected: Redis sorted set, Lua atomicity, sliding window, key namespacing
2. "Why not use a counter with TTL instead of a sorted set?"
    - Expected: fixed window boundary exploit, 200 requests in 2 seconds
3. "What happens if Redis goes down? How does your rate limiter behave?"
    - Expected: fail open (allow all) vs fail closed (deny all). Tradeoff discussion. Circuit breaker.
4. "How would you support different rate limits per customer tier?"
    - Expected: pass limit as ARGV to Lua, load from config/DB per sourceId
5. "Your rate limiter is accurate but adds 5ms latency to every request. How do you fix it?"
    - Expected: Redis pipelining, async recording, token bucket instead of sliding window
6. "Why is the Lua script the right tool here and not a Redis transaction (MULTI/EXEC)?"
    - Expected: MULTI/EXEC doesn't guarantee atomicity under watch conflicts, Lua is truly atomic
7. "How would you test the race condition you prevented with Lua?"
    - Expected: concurrent threads, CountDownLatch, verify exactly 100 requests succeed

---

**Gotchas and Watch-outs**

**Redis key collisions**

- Never use bare keys like `source-abc`
- Always namespace: `rl:source-abc`, `cache:source-abc`, `session:source-abc`
- Redis is a flat keyspace — no folders, no namespaces built in

**Sorted set memory leak**

- Skip ZREMRANGEBYSCORE → sorted set grows forever
- Old timestamps never evicted → ZCOUNT includes requests from hours ago → everyone rate limited permanently

**`return` after writing error response**

- Forget `return` after 400/429 → execution continues to `chain.doFilter()`
- Spring MVC tries to write another response on top → `IllegalStateException: response already committed`

**`Long result == 1L` bug**

- Java caches `Long` objects only for values -128 to 127
- `result == 1L` works accidentally for small numbers
- `Long.valueOf(1L).equals(result)` is always correct
- Same bug exists for any boxed type comparison with `==`

**`@PostConstruct` in tests**

- Spring never starts with plain `new` → `@PostConstruct` never fires
- `rateLimitScript` stays null in unit test
- Mock swallows `execute()` call before null script matters
- Always use constructor injection — testable without Spring context

**Horizontal scaling gotcha**

- Rate limiter works perfectly locally with one instance
- Deploy 3 instances without Redis → each allows 100 → 300 effective limit
- Always test rate limiting behind a load balancer in staging

**Remaining count off-by-one**

- After 100th request: count=100, limit=100, remaining=0 ✅
- After 101st request: count=101, remaining=-1 without Math.max → always floor at 0

**`X-RateLimit-Reset` timestamp**

- Don't send a fixed reset time — sliding window has no fixed reset
- Send `now + windowMs` as an approximation
- Strictly accurate reset time requires knowing when the oldest request in the window expires

---

**One paragraph interview answer**

> "I built a distributed sliding window rate limiter using a Redis Sorted Set where each member is a request timestamp scored by that same timestamp. On every request, an atomic Lua script runs three operations: ZADD to record the request, ZREMRANGEBYSCORE to evict timestamps outside the 60-second window, and ZCOUNT to get the current rate. The script returns the raw count and Java makes the allow/deny decision. Atomicity is critical — without it, concurrent requests both read count=99 and both proceed, breaking the limit. The limiter lives in a Servlet Filter so requests are rejected before Spring MVC does any work. Redis is shared across all app instances so the limit holds regardless of horizontal scale."