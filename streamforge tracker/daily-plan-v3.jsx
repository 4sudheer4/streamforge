import { useState, useEffect } from "react";

// ─── 76 UNIQUE PROBLEMS · 71% ROADMAP COVERAGE · 100% PROJECT SYNCED ───────
// Every weekday LC problem mirrors the StreamForge component built that same evening
// Saturday = extra problems + integration work
// Sunday = gap problems (NEW tag) + re-solves (RETIME tag)

const SCHEDULE = [
  {
    week: 1, theme: "Arrays + HashMap + Deduplication", color: "#38bdf8",
    month: 1, phasesCovered: "Ph 1 + Ph 2 + Ph 3", lcPattern: "Arrays + HashMap",
    days: [
      {
        day: 1, label: "Mon",
        coding: {
          phase: "Ph 1", task: "Spring Boot 3.3 skeleton",
          details: [
            "Create Maven project: web, jpa, redis, kafka, validation, actuator, lombok, micrometer-prometheus",
            "Package structure: com.streamforge.{api, domain, engine, infra, config, common}",
            "StreamEvent.java record: id(UUID), sourceId(String), type(String), payload(Map<String,Object>), timestamp(Instant), fingerprint(String)",
            "StreamForgeApplication.java main class",
          ],
          claudeCode: "Generate Spring Boot 3.3 Maven project with above dependencies and package structure. Include StreamEvent record.",
          goal: "Project compiles. ./mvnw spring-boot:run starts without errors.",
        },
        lc: { number: 217, name: "Contains Duplicate", difficulty: "Easy", freq: 5, why: "HashSet O(n) — THIS IS your fingerprint store. Dedup engine you build tomorrow is the exact same pattern at HTTP scale." },
      },
      {
        day: 2, label: "Tue",
        coding: {
          phase: "Ph 1", task: "Docker Compose + Health endpoint",
          details: [
            "docker-compose.yml: postgres:16, redis:7, kafka:3.7+zookeeper, prometheus, grafana — all with healthchecks",
            "application.yml: datasource, redis, kafka bootstrap, actuator endpoints, management.prometheus.enabled=true",
            "HealthController: GET /health → {status: UP, version: 1.0}",
            "Flyway V1: CREATE TABLE stream_events(id UUID PK, source_id, type, payload JSONB, timestamp TIMESTAMPTZ, fingerprint)",
          ],
          claudeCode: "Generate docker-compose.yml with postgres:16, redis:7, kafka:3.7, prometheus, grafana. All containers with healthcheck.",
          goal: "docker compose up → all 5 containers healthy. /health returns 200.",
        },
        lc: { number: 1, name: "Two Sum", difficulty: "Easy", freq: 5, why: "HashMap complement lookup — fingerprint→cachedResult map IS this. You find the complement; dedup finds the cached result. Identical structure." },
      },
      {
        day: 3, label: "Wed",
        coding: {
          phase: "Ph 2", task: "FingerprintGenerator + DeduplicationEngine",
          details: [
            "FingerprintGenerator: SHA-256 of (sourceId + type + sorted_payload_json + floor(timestamp/5min)*5min)",
            "DeduplicationEntry record: fingerprint, result(EventResult), createdAt, expiresAt(Instant)",
            "DeduplicationEngine: ConcurrentHashMap<String, DeduplicationEntry> with configurable TTL default 30min",
            "deduplicateOrProcess(event, processor): check map → cached → return | new → process + store + return",
          ],
          claudeCode: "Build FingerprintGenerator using SHA-256 and DeduplicationEngine with ConcurrentHashMap and TTL-based eviction.",
          goal: "Unit test: POST same event twice → second call returns cached entry, not reprocessed.",
        },
        lc: { number: 242, name: "Valid Anagram", difficulty: "Easy", freq: 3, why: "Frequency map pattern — same HashMap counting used in TopKEventTracker you build Friday. Build the counting intuition now." },
      },
      {
        day: 4, label: "Thu",
        coding: {
          phase: "Ph 2", task: "Event ingestion endpoint + Micrometer metrics",
          details: [
            "@Scheduled eviction: every 60s remove entries where expiresAt < now()",
            "EventIngestionService: fingerprint → dedup check → persist to PostgreSQL → return EventResult",
            "EventController: POST /api/v1/events → 200 (new) or 208 Already Reported (duplicate)",
            "Micrometer: dedup_hits counter, dedup_misses counter, dedup_ratio gauge — verify in /actuator/prometheus",
          ],
          claudeCode: "Wire EventController POST /api/v1/events with EventIngestionService. Micrometer dedup_ratio gauge. @Scheduled eviction every 60s.",
          goal: "POST same event twice → 200 then 208. /actuator/prometheus shows dedup_ratio.",
        },
        lc: { number: 49, name: "Group Anagrams", difficulty: "Medium", freq: 4, why: "HashMap<sorted_key, list> grouping — real Meta question. Same grouping logic as routing events to handlers by type in Ph6 RuleEngine." },
      },
      {
        day: 5, label: "Fri",
        coding: {
          phase: "Ph 3", task: "Top-K Event Tracker",
          details: [
            "TopKEventTracker: ConcurrentHashMap<String, AtomicLong> counts + PriorityQueue min-heap capacity K",
            "record(String type): increment AtomicLong in map — O(1)",
            "getTopK(int k): iterate map → maintain min-heap size k → return sorted List<TopKEntry>",
            "GET /api/v1/analytics/top-events?k=10 → [{rank, type, count, pct}]",
          ],
          claudeCode: "Implement TopKEventTracker with ConcurrentHashMap for counts and PriorityQueue min-heap size K. Wire to analytics endpoint.",
          goal: "GET /api/v1/analytics/top-events?k=10 returns correct ranked types after posting test events.",
        },
        lc: { number: 347, name: "Top K Frequent Elements", difficulty: "Medium", freq: 5, why: "THIS IS TopKEventTracker. Min-heap size K, O(n log k). You solved the algorithm in the morning — implement it in production this evening." },
      },
      {
        day: 6, label: "Sat",
        coding: {
          phase: "Ph 2+3", task: "Integration test + Grafana dashboard",
          details: [
            "Integration test: POST 50 events across 5 types → verify top-K correct → verify dedup on repeat",
            "Import Grafana dashboard JSON with dedup_ratio panel and top-events table",
            "GET /api/v1/events/{id} → fetch event by ID from PostgreSQL",
            "Fix any bugs found during integration",
          ],
          claudeCode: "Generate @SpringBootTest integration test for event dedup and Top-K tracker with real PostgreSQL.",
          goal: "Integration tests green. Grafana shows dedup_ratio updating in real time.",
        },
        lc: [
          { number: 238, name: "Product of Array Except Self", difficulty: "Medium", freq: 5, why: "Prefix + suffix pass. No division. Same prefix chain as config inheritance (Ph8) — root config prefix, override suffix." },
          { number: 128, name: "Longest Consecutive Sequence", difficulty: "Medium", freq: 4, why: "HashSet O(n) — only start from numbers with no left neighbor. Same bucketing logic as fingerprint 5-min time windows." },
        ],
      },
      {
        day: 7, label: "Sun",
        coding: null,
        lc: [
          { number: 217, name: "Contains Duplicate — RE-SOLVE 15min", difficulty: "Easy", freq: 5, why: "Cold timed. HashSet pattern must be automatic. No hints." },
          { number: 1,   name: "Two Sum — RE-SOLVE 10min",             difficulty: "Easy", freq: 5, why: "Cold timed. HashMap complement lookup from memory." },
          { number: 49,  name: "Group Anagrams — RE-SOLVE 20min",      difficulty: "Medium", freq: 4, why: "Cold timed. Explain grouping logic out loud as you code." },
        ],
        note: "No new coding today. Re-solve 3 problems timed. After each one: write the pattern in plain English. Not code — English.",
      },
    ],
  },
  {
    week: 2, theme: "Two Pointers + Sliding Window + Rate Limiter", color: "#34d399",
    month: 1, phasesCovered: "Ph 4 + Ph 5", lcPattern: "Two Pointers + Sliding Window",
    days: [
      {
        day: 1, label: "Mon",
        coding: {
          phase: "Ph 4", task: "Redis config + Lua rate limit script",
          details: [
            "RedisConfig: LettuceConnectionFactory, RedisTemplate<String,String>, StringRedisSerializer",
            "rate_limit.lua: ZADD timestamp → ZREMRANGEBYSCORE(0, now-windowMs) → ZCOUNT → return 0 or 1 — all atomic",
            "SlidingWindowRateLimiter: load Lua from classpath, key='rl:{sourceId}', window=60000ms, max=100",
            "tryAcquire(sourceId): execute Lua script → returns boolean",
          ],
          claudeCode: "Generate Redis Lettuce config and SlidingWindowRateLimiter with atomic Lua script. Key pattern 'rl:{sourceId}'.",
          goal: "Unit test: tryAcquire true 100x, false on 101st within same 60s window.",
        },
        lc: { number: 125, name: "Valid Palindrome", difficulty: "Easy", freq: 3, why: "Two pointer warm-up — left/right converge. Learn the pointer movement pattern before window problems this week." },
      },
      {
        day: 2, label: "Tue",
        coding: {
          phase: "Ph 4", task: "RateLimitFilter + response headers",
          details: [
            "RateLimitFilter extends OncePerRequestFilter: extract X-Source-Id header → tryAcquire",
            "429 body: {error:'rate_limit_exceeded', retryAfter:seconds, limit:100, window:'60s'}",
            "Headers on ALL responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
            "Register in FilterRegistrationBean with order before auth filters",
          ],
          claudeCode: "Build Spring OncePerRequestFilter for rate limiting. 429 JSON with retryAfter. X-RateLimit headers on every response.",
          goal: "Send 110 requests → first 100 return 200 with headers, last 10 return 429 with correct Retry-After.",
        },
        lc: { number: 3, name: "Longest Substring Without Repeating Chars", difficulty: "Medium", freq: 5, why: "THIS IS SlidingWindowRateLimiter. Window = time range. Left pointer shrink = ZREMRANGEBYSCORE removing expired timestamps. Window size = ZCOUNT." },
      },
      {
        day: 3, label: "Wed",
        coding: {
          phase: "Ph 5", task: "Kafka producer + topic setup",
          details: [
            "KafkaConfig: ProducerFactory with enable.idempotence=true, acks=all, retries=3, max.in.flight=5",
            "Topics via TopicBuilder: events (12 partitions), anomalies (3 partitions), dlq (1 partition)",
            "EventKafkaProducer: KafkaTemplate<String,String> — serialize StreamEvent to JSON, key=sourceId",
            "Wire into EventIngestionService: publish to 'events' topic after successful persist",
          ],
          claudeCode: "Spring Kafka producer config with idempotent settings. Create topics: events (12p), anomalies, dlq. Wire KafkaTemplate into EventIngestionService.",
          goal: "POST event → message appears in 'events' topic via kafka-console-consumer --from-beginning.",
        },
        lc: { number: 121, name: "Best Time to Buy and Sell Stock", difficulty: "Easy", freq: 5, why: "Min-so-far window of 2 — THIS IS SpikeDetector rolling baseline. Track minimum seen so far = rolling average floor for spike comparison." },
      },
      {
        day: 4, label: "Thu",
        coding: {
          phase: "Ph 5", task: "MonotonicDeque spike detector",
          details: [
            "RequestBucket record: timestamp(Instant), requestCount(long)",
            "MonotonicDequeAnalyzer: ArrayDeque<RequestBucket> — pop back if new.count >= back.count, pop front if outside window",
            "getMaxInWindow(sourceId, windowMs): front of deque = max rate — O(1)",
            "SpikeDetector: after each request, record → if currentRate > 3x rollingAvg → publish SpikeEvent to Kafka 'anomalies'",
          ],
          claudeCode: "Implement MonotonicDequeAnalyzer tracking max request rate in sliding window. SpikeDetector publishes SpikeEvent to Kafka anomalies when rate > 3x rolling average.",
          goal: "Burst 200 requests → SpikeEvent appears in Kafka 'anomalies' topic with correct multiplier.",
        },
        lc: { number: 11, name: "Container With Most Water", difficulty: "Medium", freq: 5, why: "Two pointer max optimization — move shorter side inward. Same left/right convergence logic as finding max window capacity in rate limiter." },
      },
      {
        day: 5, label: "Fri",
        coding: {
          phase: "Ph 5", task: "Rate stats endpoint + Kafka DLQ",
          details: [
            "GET /api/v1/analytics/rate-stats/{sourceId}: {currentRate, maxInWindow, rollingAvg, spikeCount, lastSpikeAt}",
            "DLQ: Kafka publish fails 3x → DeadLetterPublishingRecoverer routes to 'dlq' topic",
            "DLQ consumer: @KafkaListener on 'dlq' — log failed events with reason",
            "Grafana panel: current rate + max in window per source",
          ],
          claudeCode: "Add rate-stats REST endpoint. Spring Kafka DefaultErrorHandler with 3 retries then DeadLetterPublishingRecoverer to dlq topic.",
          goal: "rate-stats returns live data. DLQ consumer logs failures. Grafana shows rate data.",
        },
        lc: { number: 239, name: "Sliding Window Maximum", difficulty: "Hard", freq: 4, why: "THIS IS MonotonicDequeAnalyzer exactly. ArrayDeque. Pop back when new >= back. Pop front when out of window. Front = max rate. O(n) total." },
      },
      {
        day: 6, label: "Sat",
        coding: {
          phase: "Ph 4+5", task: "E2E test + Grafana rate panels",
          details: [
            "Integration test: rate limit filter → Kafka publish → DLQ on failure — full flow in one test",
            "Grafana dashboard: current rate, max in window, spike count, DLQ depth panels",
            "Verify Redis sorted sets in redis-cli: ZRANGE rl:{sourceId} 0 -1 WITHSCORES",
            "Document rate limiter behavior and Lua script in README section",
          ],
          claudeCode: "Generate Grafana dashboard JSON with rate limiting panels. E2E integration test covering rate limit + Kafka flow.",
          goal: "E2E: POST events → rate limited at 100/min → spike detected → Grafana shows all data.",
        },
        lc: [
          { number: 76, name: "Minimum Window Substring", difficulty: "Hard", freq: 5, why: "Variable-size window with character frequency constraint — hardest sliding window. Tests full pattern mastery. Rate limiter edge cases use this logic." },
        ],
      },
      {
        day: 7, label: "Sun",
        coding: null,
        lc: [
          { number: 167, name: "Two Sum II — NEW",             difficulty: "Medium", freq: 4, why: "Two pointer on sorted array — O(1) space variant of LC1. Different from HashSet approach." },
          { number: 15,  name: "3Sum — NEW",                   difficulty: "Medium", freq: 5, why: "Sort + two pointer. Stripe asks this. Fix one element, two-pointer the rest. Must know." },
          { number: 42,  name: "Trapping Rain Water — NEW",    difficulty: "Hard",   freq: 5, why: "Two pointer + stack. Highest frequency Hard in this pattern. Two pointer: track left/right max." },
        ],
        note: "3 new two-pointer problems today. These fill the pattern gap from weekdays. Take 40min each. No time pressure — understand the approach.",
      },
    ],
  },
  {
    week: 3, theme: "Stack + Binary Search + Expression Engine", color: "#a78bfa",
    month: 1, phasesCovered: "Ph 6 + Ph 7", lcPattern: "Stack + Binary Search",
    days: [
      {
        day: 1, label: "Mon",
        coding: {
          phase: "Ph 6", task: "JSON Structure Validator",
          details: [
            "JsonStructureValidator: Deque<Character> — push on {,[,( and pop+match on },],)",
            "ValidationResult record: isValid(boolean), errorPosition(int), errorMessage(String)",
            "Return specific error: 'Expected } but found ]' at position 47",
            "Wire into EventIngestionService: validate payload before fingerprinting → 400 on invalid",
          ],
          claudeCode: "Implement stack-based JSON structure validator using Deque<Character>. Return ValidationResult with error position on mismatch.",
          goal: "POST malformed JSON → 400 with exact error position. Valid JSON → processes normally.",
        },
        lc: { number: 20, name: "Valid Parentheses", difficulty: "Easy", freq: 4, why: "THIS IS JsonStructureValidator. Push open brackets, pop and match close brackets. Know this cold — appears in 30%+ of stack rounds." },
      },
      {
        day: 2, label: "Tue",
        coding: {
          phase: "Ph 6", task: "Expression Tokenizer + RPN Converter",
          details: [
            "Token sealed interface: Operand(value), Comparator(>, <, ==, !=), LogicalOp(AND, OR, NOT), Paren",
            "ExpressionTokenizer: split 'latency > 500 AND type == payment' into List<Token>",
            "RPNConverter: Shunting Yard — operator stack + output queue. Precedence: NOT(4) > CMP(3) > AND(2) > OR(1)",
            "Test: 'latency > 500 AND type == payment' → RPN [latency, 500, >, type, payment, ==, AND]",
          ],
          claudeCode: "Implement ExpressionTokenizer and Shunting Yard RPNConverter. Support AND/OR/NOT/>/</==/!= with correct precedence.",
          goal: "'latency > 500 AND type == payment' converts to correct RPN token list.",
        },
        lc: { number: 155, name: "Min Stack", difficulty: "Medium", freq: 4, why: "Two stacks — auxiliary tracking stack. O(1) getMin. Tests stack design thinking before building the production expression evaluator." },
      },
      {
        day: 3, label: "Wed",
        coding: {
          phase: "Ph 6", task: "RPN Evaluator + Rule Engine",
          details: [
            "RPNEvaluator: operand stack, evaluate List<Token> against Map<String,Object> event context",
            "Support: numeric compare, string compare, boolean AND/OR/NOT — return boolean",
            "RouteRule JPA entity: id, name, expression, targetHandler, priority, active. Flyway V3.",
            "RuleEngine.evaluate(event): load active rules → evaluate each → return matched handlers by priority",
          ],
          claudeCode: "Build RPNEvaluator evaluating token list against event context Map. RouteRule JPA entity. RuleEngine evaluating all active rules on each event.",
          goal: "Create rule 'type == payment' → POST payment event matches. POST sms event does not match.",
        },
        lc: { number: 150, name: "Evaluate Reverse Polish Notation", difficulty: "Medium", freq: 3, why: "THIS IS RPNEvaluator. Operand stack, same 3 operations: push operand, apply operator to top 2. You implement this in production today." },
      },
      {
        day: 4, label: "Thu",
        coding: {
          phase: "Ph 7", task: "Time-series index + query endpoints",
          details: [
            "Flyway V4: CREATE INDEX idx_events_timestamp ON stream_events(timestamp DESC NULLS LAST)",
            "TimeSeriesRepository: findAtOrBefore(Instant t) — WHERE timestamp <= :t ORDER BY timestamp DESC LIMIT 1",
            "findInRange(Instant start, Instant end, Pageable p): paginated range query",
            "GET /api/v1/events/at?timestamp={iso8601} and GET /api/v1/events/range?start=&end= endpoints",
          ],
          claudeCode: "Add timestamp B-tree index via Flyway. TimeSeriesRepository with findAtOrBefore and range queries. EXPLAIN ANALYZE to verify index scan.",
          goal: "EXPLAIN ANALYZE shows Index Scan not Seq Scan. Range query on 100K events returns in < 20ms.",
        },
        lc: { number: 739, name: "Daily Temperatures", difficulty: "Medium", freq: 5, why: "Monotonic decreasing stack — next-greater pattern. Ph9 deadline-aware scheduling: next task whose deadline is closer. Stack pattern thinking." },
      },
      {
        day: 5, label: "Fri",
        coding: {
          phase: "Ph 7", task: "Capacity Optimizer",
          details: [
            "EventBatch record: id(UUID), taskCount(int), processingCostMs(long), priority(int 1-10)",
            "feasible(int workers, List<EventBatch> batches, long deadlineMs): round-robin simulate, return boolean",
            "findOptimalWorkers(batches, deadline): binary search lo=1 hi=batches.size(), feasible(mid) → shrink right",
            "GET /api/v1/system/optimal-workers?deadline_ms=100 → {optimalWorkers, deadlineMs, utilizationPct}",
          ],
          claudeCode: "Implement CapacityOptimizer with binary search on answer space. feasible() simulates round-robin batch assignment to workers.",
          goal: "Known batch set + deadline → binary search finds correct minimum workers. Verify with manual calculation.",
        },
        lc: { number: 84, name: "Largest Rectangle in Histogram", difficulty: "Hard", freq: 5, why: "Hardest monotonic stack problem. Monotonic increasing stack tracking indices. Mastering this means stack patterns are fully owned." },
      },
      {
        day: 6, label: "Sat",
        coding: {
          phase: "Ph 6+7", task: "Integration + benchmark",
          details: [
            "Integration test: create rule → POST matching/non-matching events → verify routing",
            "BenchmarkService: seed 100K events, time range query with index vs full scan. Document speedup.",
            "Fix any bugs found from week",
            "Update README: add time-series query and rule engine documentation",
          ],
          claudeCode: "Generate BenchmarkService comparing indexed vs full-scan query on large event table. Integration test for rule engine routing.",
          goal: "Benchmark shows measurable speedup (target 10x+). Integration tests green.",
        },
        lc: [
          { number: 704, name: "Binary Search", difficulty: "Easy", freq: 4, why: "3 templates: exact match, left bound, right bound. Know all three cold. PostgreSQL B-tree index IS binary search on disk." },
          { number: 153, name: "Find Min in Rotated Sorted Array", difficulty: "Medium", freq: 5, why: "Which half is sorted? Most common BS variant. Pairs with LC33 already in this week." },
          { number: 33,  name: "Search in Rotated Sorted Array", difficulty: "Medium", freq: 5, why: "Classic BS — determine which sorted half contains target. Ph7 rotated time-series search." },
          { number: 875, name: "Koko Eating Bananas", difficulty: "Medium", freq: 4, why: "THIS IS CapacityOptimizer. Binary search on answer space. feasible() predicate is monotonic." },
          { number: 981, name: "Time Based Key-Value Store", difficulty: "Medium", freq: 4, why: "Right-bound binary search on timestamps. THIS IS findAtOrBefore() — largest timestamp ≤ query time." },
        ],
      },
      {
        day: 7, label: "Sun",
        coding: null,
        lc: [
          { number: 22, name: "Generate Parentheses — NEW", difficulty: "Medium", freq: 4, why: "Backtracking on stack — add open if count < n, add close if close < open. Builds on LC20 this week." },
          { number: 74, name: "Search 2D Matrix — NEW",     difficulty: "Medium", freq: 4, why: "Flatten 2D to 1D binary search: row = mid/cols, col = mid%cols. Extension of Ph7 queries." },
        ],
        note: "2 new problems. Stack backtracking + 2D binary search. Then re-solve LC20 and LC150 timed 15min each.",
      },
    ],
  },
  {
    week: 4, theme: "Trees + Heap + Source Hierarchy", color: "#fb7185",
    month: 2, phasesCovered: "Ph 8 + Ph 9", lcPattern: "Trees + Heap",
    days: [
      {
        day: 1, label: "Mon",
        coding: {
          phase: "Ph 8", task: "Source entity + adjacency list tree",
          details: [
            "Flyway V5: CREATE TABLE sources(id UUID PK, parent_id UUID REFERENCES sources(id), name, config JSONB, created_at)",
            "Source JPA entity + SourceNode record: id, parentId, name, config(Map), children(List<SourceNode>)",
            "HierarchyService.buildTree(): load all → HashMap<UUID,SourceNode> → recursive buildChildren(parentId)",
            "POST /api/v1/sources, GET /api/v1/sources, GET /api/v1/sources/{id}",
          ],
          claudeCode: "Generate Source JPA entity with self-referencing parentId. HierarchyService building in-memory SourceNode tree from adjacency list.",
          goal: "POST 3 sources (root + 2 children) → buildTree() returns correct tree with children populated.",
        },
        lc: { number: 226, name: "Invert Binary Tree", difficulty: "Easy", freq: 3, why: "Recursion template — swap left and right at each node. Understand this before all other tree problems. Every tree operation uses this recursive structure." },
      },
      {
        day: 2, label: "Tue",
        coding: {
          phase: "Ph 8", task: "Config inheritance DFS",
          details: [
            "resolveConfig(UUID sourceId): DFS path root→target, merge configs — child value overrides parent value",
            "Return {config: Map<String,String>, inheritanceChain: List<String> node names root→leaf}",
            "levelOrderTraversal(UUID rootId): BFS with queue → List<List<SourceNode>> grouped by level",
            "GET /api/v1/sources/{id}/effective-config → resolved config + inheritanceChain",
          ],
          claudeCode: "Build resolveConfig DFS walking root to target merging configs. levelOrderTraversal BFS returning nodes grouped by depth level.",
          goal: "Child source overrides parent key correctly. Inheritance chain shows full path in API response.",
        },
        lc: { number: 102, name: "Binary Tree Level Order Traversal", difficulty: "Medium", freq: 5, why: "THIS IS levelOrderTraversal(). BFS with queue, process level by level. Know this cold — used in 10+ problems and directly in your Ph8 code tonight." },
      },
      {
        day: 3, label: "Wed",
        coding: {
          phase: "Ph 8", task: "LCA permissions + Kafka snapshots",
          details: [
            "PermissionResolver.findLCA(UUID a, UUID b): path-to-root for both sources, find deepest common ancestor",
            "canShareData(a, b): findLCA → check LCA.config.get('sharing_policy') → return boolean",
            "TreeSerializer: BFS level-order → JSON string with null markers for missing children",
            "On source CREATE/UPDATE/DELETE: serialize full tree → publish to Kafka 'hierarchy-snapshots' topic",
          ],
          claudeCode: "LCA algorithm for SourceNode tree using path-to-root comparison. TreeSerializer BFS serialization. Kafka publisher on source mutations.",
          goal: "canShareData returns correct policy from LCA node. Hierarchy snapshot appears in Kafka on source create.",
        },
        lc: [
          { number: 235, name: "LCA of BST", difficulty: "Medium", freq: 4, why: "BST LCA — use BST property (both smaller → go left, both larger → go right). Easier than general tree. Build intuition before LC236 tomorrow." },
          { number: 102, name: "Level Order (re-solve timed 20min)", difficulty: "Medium", freq: 5, why: "Re-solve cold. BFS queue pattern must be instant. You implement it tonight." },
        ],
      },
      {
        day: 4, label: "Thu",
        coding: {
          phase: "Ph 9", task: "Priority scheduler + Java 21 virtual threads",
          details: [
            "ProcessingTask record: eventId(UUID), type, priority(int 1-10), deadlineEpochMs(long), cooldownMs(long)",
            "PriorityEventScheduler: PriorityQueue<ProcessingTask> with Comparator priority DESC then deadlineEpochMs ASC",
            "CooldownRegistry: ConcurrentHashMap<String, Long> lastProcessedMs per type. canProcess(type, cooldownMs).",
            "WorkerPool: Executors.newVirtualThreadPerTaskExecutor() — K workers polling scheduler.next()",
          ],
          claudeCode: "Build PriorityEventScheduler with custom comparator. CooldownRegistry. WorkerPool using Java 21 virtual thread executor.",
          goal: "Submit tasks priority 1–10 → priority 10 processes first. Cooldown period respected per type.",
        },
        lc: { number: 236, name: "LCA of Binary Tree", difficulty: "Medium", freq: 5, why: "THIS IS PermissionResolver.findLCA(). General tree — no BST property. Return non-null up the tree. Real Meta question. Know cold." },
      },
      {
        day: 5, label: "Fri",
        coding: {
          phase: "Ph 9", task: "Two-heap P50 tracker + scheduler metrics",
          details: [
            "MedianLatencyTracker: PriorityQueue maxHeap (lower half, reversed) + PriorityQueue minHeap (upper half)",
            "addLatency(long ms): add to maxHeap → rebalance: if maxHeap.peek() > minHeap.peek() move top → balance sizes |diff| ≤ 1",
            "getP50(): larger heap → return peek. Equal size → average both peeks.",
            "GET /api/v1/analytics/latency → {p50HeapMs, p50PrometheusMs, sampleCount}",
          ],
          claudeCode: "Implement MedianLatencyTracker with two PriorityQueues. getP50() from larger heap. Verify within 2% of Prometheus histogram p50.",
          goal: "P50 from two heaps within 2% of Prometheus histogram on 10K latency samples.",
        },
        lc: { number: 215, name: "Kth Largest Element in Array", difficulty: "Medium", freq: 5, why: "Min-heap size K — foundation of all top-K heap problems. You built TopKTracker in Ph3; this is the pure algorithm form." },
      },
      {
        day: 6, label: "Sat",
        coding: {
          phase: "Ph 8+9", task: "Grafana + integration tests",
          details: [
            "Grafana dashboard: queue_depth gauge, p50 heap vs prometheus comparison, tasks_per_sec counter",
            "Integration test: config inheritance chain end-to-end with 3-level hierarchy",
            "Integration test: priority scheduling — verify ordering with mixed priority tasks",
            "Fix bugs from the week",
          ],
          claudeCode: "Generate integration tests for config inheritance and priority scheduler task ordering.",
          goal: "All integration tests green. Grafana shows scheduler metrics updating in real time.",
        },
        lc: [
          { number: 199, name: "Binary Tree Right Side View", difficulty: "Medium", freq: 4, why: "BFS rightmost at each level — extends level order traversal. Config visible at deepest override level." },
          { number: 621, name: "Task Scheduler", difficulty: "Medium", freq: 4, why: "THIS IS CooldownRegistry. Max-heap with cooldown per type. Process most frequent that's not cooling down." },
          { number: 295, name: "Find Median from Data Stream", difficulty: "Hard", freq: 5, why: "THIS IS MedianLatencyTracker. Two heaps. Invariant: |maxHeap.size - minHeap.size| ≤ 1. Know every step cold." },
          { number: 105, name: "Construct Tree from Pre+Inorder", difficulty: "Medium", freq: 4, why: "Tree construction from encoded form — builds intuition for Ph8 TreeSerializer/Deserializer." },
          { number: 124, name: "Binary Tree Maximum Path Sum", difficulty: "Hard", freq: 5, why: "DFS post-order returning max single-branch sum. Most important tree Hard. Max config path in hierarchy." },
        ],
      },
      {
        day: 7, label: "Sun",
        coding: null,
        lc: [
          { number: 206, name: "Reverse Linked List — NEW",    difficulty: "Easy",   freq: 5, why: "MUST know cold — foundation of all LL problems. Iterative: prev/curr/next pointers. 10 min max." },
          { number: 21,  name: "Merge Two Sorted Lists — NEW", difficulty: "Easy",   freq: 4, why: "Two pointer LL merge. Know cold. Base case for merge K sorted lists (Week 7)." },
          { number: 141, name: "Linked List Cycle — NEW",      difficulty: "Easy",   freq: 4, why: "Fast/slow pointer cycle detection. Floyd's algorithm. 10 min." },
        ],
        note: "3 linked list must-knows. All Easy — each should take 10–15min. Then re-solve LC295 timed 25min cold.",
      },
    ],
  },
  {
    week: 5, theme: "Graphs + Dynamic Programming + Dependency Graph", color: "#22d3ee",
    month: 2, phasesCovered: "Ph 10 + Ph 11", lcPattern: "Graphs + DP",
    days: [
      {
        day: 1, label: "Mon",
        coding: {
          phase: "Ph 10", task: "Processor entity + three-color cycle detection",
          details: [
            "Flyway V6: CREATE TABLE processors(id UUID PK, name VARCHAR UNIQUE, dependencies TEXT[])",
            "Processor JPA entity + DependencyGraph: build HashMap<String, List<String>> from processor list",
            "CycleDetector: Map<String, Color> where Color = WHITE/GRAY/BLACK enum",
            "hasCycle(): DFS — encountering GRAY node = back edge = cycle found. Return List<String> cycle path.",
          ],
          claudeCode: "Build three-color DFS cycle detector for processor dependency graph. Return full cycle path when detected.",
          goal: "A→B→C: no cycle. A→B→C→A: returns [A,B,C,A] cycle path. POST validates no cycle.",
        },
        lc: { number: 207, name: "Course Schedule", difficulty: "Medium", freq: 5, why: "THREE-COLOR DFS cycle detection — THIS IS CycleDetector. GRAY = in current DFS path = back edge = cycle. You implement this tonight." },
      },
      {
        day: 2, label: "Tue",
        coding: {
          phase: "Ph 10", task: "Topological sort + parallel execution groups",
          details: [
            "TopologicalSorter.kahn(graph): compute in-degree map → queue zero-in-degree nodes → BFS → ordered list",
            "parallelGroups(graph): BFS level by level — each level = List<String> of processors that can run simultaneously",
            "POST /api/v1/processors: run CycleDetector → 400 with {error, cyclePath} if cycle found",
            "GET /api/v1/processors/startup-order → {processorCount, topologicalOrder, parallelGroups}",
          ],
          claudeCode: "Implement Kahn's BFS topological sort. parallelGroups returns processors grouped by dependency level.",
          goal: "A→B, A→D, B→C: order=[A,B,D,C], parallelGroups=[[A],[B,D],[C]]",
        },
        lc: { number: 210, name: "Course Schedule II", difficulty: "Medium", freq: 4, why: "Kahn's BFS topological sort — THIS IS TopologicalSorter.kahn(). Returns ordering not just boolean. parallelGroups extends this." },
      },
      {
        day: 3, label: "Wed",
        coding: {
          phase: "Ph 10", task: "Connected components + BFS reachability",
          details: [
            "ConnectedComponents: DFS with visited Set<String> → group processors by component",
            "GET /api/v1/processors/components → [{componentId, members:[...], size, hasIsolated}]",
            "BFSReachability: canReach(String from, String to, int maxHops) — BFS with hop counter",
            "GET /api/v1/processors/reachable?from=A&to=B&maxHops=5 → {reachable, hops, path}",
          ],
          claudeCode: "ConnectedComponents DFS finder and BFSReachability with hop limit. Publish dependency snapshots to Kafka on processor changes.",
          goal: "Disconnected graph → correct component grouping. BFS reachability returns correct hop count.",
        },
        lc: { number: 200, name: "Number of Islands", difficulty: "Medium", freq: 5, why: "DFS flood fill — most asked graph problem. Know cold. ConnectedComponents is this exact algorithm on arbitrary graph instead of grid." },
      },
      {
        day: 4, label: "Thu",
        coding: {
          phase: "Ph 11", task: "0/1 Knapsack Token Budget Optimizer",
          details: [
            "Flyway V7: CREATE TABLE event_batches(id UUID, name, token_cost INT, priority INT, description)",
            "TokenBudgetOptimizer: int[] dp = new int[budget+1]. Outer: batches. Inner: budget DESCENDING from budget to cost.",
            "dp[b] = Math.max(dp[b], dp[b - batch.tokenCost()] + batch.priority())",
            "selectBatches(): backtrack from dp[budget] to identify which batches included",
          ],
          claudeCode: "Implement 0/1 Knapsack DP for token budget optimization. DESCENDING inner loop. Backtrack to find selected batches.",
          goal: "Construct case where greedy (sort by priority/cost) fails — DP finds higher total priority. Document it.",
        },
        lc: { number: 70, name: "Climbing Stairs", difficulty: "Easy", freq: 4, why: "DP entry point — Fibonacci recurrence. dp[i] = dp[i-1] + dp[i-2]. Build DP intuition before knapsack." },
      },
      {
        day: 5, label: "Fri",
        coding: {
          phase: "Ph 11", task: "Config Diff Engine (Edit Distance)",
          details: [
            "FlatConfigSerializer: flatten Map<String,Object> to sorted List<String> of 'key.path=value' entries",
            "ConfigDiffEngine: int[][] dp = new int[n+1][m+1]. Fill: if equal dp[i-1][j-1] else min(delete,insert,modify)+1",
            "generatePatch(): backtrack from dp[n][m] → List<PatchOperation{op:ADD/REMOVE/MODIFY, key, oldVal, newVal}>",
            "GET /api/v1/configs/diff?fromSourceId={id}&toSourceId={id} → {totalOps, patch:[...]}",
          ],
          claudeCode: "Build ConfigDiffEngine using edit distance DP on config entry lists. generatePatch backtracking for ADD/REMOVE/MODIFY operations.",
          goal: "Two known config versions → diff returns correct minimum patch. Backtracking correct.",
        },
        lc: { number: 416, name: "Partition Equal Subset Sum", difficulty: "Medium", freq: 4, why: "THIS IS 0/1 Knapsack — descending iteration. SAME structure as TokenBudgetOptimizer you built yesterday. The connection is direct." },
      },
      {
        day: 6, label: "Sat",
        coding: {
          phase: "Ph 10+11", task: "Integration tests + optimizer docs",
          details: [
            "Integration test: cycle detection rejects via API — POST processor creating cycle → verify 400 with cyclePath",
            "Integration test: config diff returns correct patch on known config pair",
            "Document greedy failure case for knapsack in README with concrete numbers",
            "Fix bugs from the week",
          ],
          claudeCode: "Integration tests for dependency graph cycle detection and config diff endpoints.",
          goal: "All tests green. Greedy failure case documented with concrete numbers showing DP wins.",
        },
        lc: [
          { number: 1143, name: "Longest Common Subsequence", difficulty: "Medium", freq: 5, why: "2D DP — foundation for edit distance. Same table structure. Build it before LC72." },
          { number: 72,   name: "Edit Distance", difficulty: "Hard", freq: 5, why: "THIS IS ConfigDiffEngine. 2D DP table. Same 3 operations. git diff and Terraform plan use this algorithm." },
          { number: 133,  name: "Clone Graph", difficulty: "Medium", freq: 4, why: "DFS + HashMap visited — builds on Ph10 dependency graph cloning pattern." },
          { number: 994,  name: "Rotting Oranges", difficulty: "Medium", freq: 4, why: "BFS multi-source — extends ConnectedComponents. Multiple starting nodes simultaneously." },
          { number: 127,  name: "Word Ladder", difficulty: "Hard", freq: 4, why: "BFS shortest path — Ph10 BFSReachability hard version. Build adjacency list on-the-fly." },
        ],
      },
      {
        day: 7, label: "Sun",
        coding: null,
        lc: [
          { number: 198, name: "House Robber — NEW", difficulty: "Medium", freq: 4, why: "1D DP pattern. dp[i] = max(dp[i-2]+nums[i], dp[i-1]). Classic 1D DP before harder variants." },
          { number: 91,  name: "Decode Ways — NEW",  difficulty: "Medium", freq: 4, why: "1D DP + string parsing. Common Meta/Amazon question. Connects to Ph6 expression tokenizer." },
          { number: 62,  name: "Unique Paths — NEW", difficulty: "Medium", freq: 4, why: "2D grid DP warmup. Simpler than edit distance. dp[i][j] = dp[i-1][j] + dp[i][j-1]." },
        ],
        note: "3 DP gap problems. Solidify 1D and 2D DP patterns before Week 7 mocks. Take time — understand the recurrence.",
      },
    ],
  },
  {
    week: 6, theme: "Intervals + LRU Cache + Trie + Greedy", color: "#f97316",
    month: 3, phasesCovered: "Ph 12 + Ph 13 + Ph 14", lcPattern: "Intervals + Cache + Greedy",
    days: [
      {
        day: 1, label: "Mon",
        coding: {
          phase: "Ph 12", task: "Window merger + min workers calculator",
          details: [
            "Flyway V8: CREATE TABLE processing_windows(id UUID, source_id UUID, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, priority INT)",
            "WindowMerger: sort by startTime → iterate, merge if current.start <= last.end (use latest end)",
            "MinWorkerCalculator: sort by startTime. PriorityQueue<Instant> min-heap of endTimes. Heap size = current concurrent.",
            "GET /api/v1/scheduler/merged-windows?sourceId={id} and GET /api/v1/scheduler/min-workers",
          ],
          claudeCode: "WindowMerger sorting by start time. MinWorkerCalculator using PriorityQueue min-heap of end times tracking peak concurrency.",
          goal: "Known overlapping windows → correct merge count. Min workers matches expected peak concurrency.",
        },
        lc: [
          { number: 252, name: "Meeting Rooms", difficulty: "Easy", freq: 4, why: "Sort by start, check adjacent overlap — easy version before MinWorkerCalculator." },
          { number: 56,  name: "Merge Intervals", difficulty: "Medium", freq: 5, why: "THIS IS WindowMerger. Sort by start, merge when current.start <= last.end. Most asked interval problem." },
        ],
      },
      {
        day: 2, label: "Tue",
        coding: {
          phase: "Ph 12", task: "Conflict resolver",
          details: [
            "ConflictResolver: sort by endTime. Keep window if no overlap with last kept (current.start >= last.end).",
            "Greedy: earliest-ending window maximizes remaining schedule space",
            "Return {keptWindows, removedWindows, removalCount}",
            "GET /api/v1/scheduler/resolve-conflicts?sourceId={id} → {removedCount, resolvedSchedule}",
          ],
          claudeCode: "ConflictResolver greedy algorithm — sort by endTime, keep earliest-ending non-overlapping windows.",
          goal: "Known conflicting schedule → minimum removals verified. Greedy choice is optimal.",
        },
        lc: [
          { number: 57,  name: "Insert Interval", difficulty: "Medium", freq: 4, why: "Find insert position, merge overlapping neighbors — extends WindowMerger for inserting new window." },
          { number: 253, name: "Meeting Rooms II", difficulty: "Medium", freq: 5, why: "THIS IS MinWorkerCalculator. Min-heap of end times. Heap size at any moment = workers needed." },
        ],
      },
      {
        day: 3, label: "Wed",
        coding: {
          phase: "Ph 13", task: "LRU Cache from scratch",
          details: [
            "DLinkedNode<K,V>: key, value, prev, next pointers",
            "LRUCache<K,V>: HashMap<K, DLinkedNode> + sentinel head + sentinel tail. int capacity.",
            "addToHead(node): node.next=head.next; node.prev=head; head.next.prev=node; head.next=node",
            "get(K key): if not in map → null. Else removeNode(node) → addToHead(node) → return value",
          ],
          claudeCode: "Implement LRU cache from scratch with DoublyLinkedList and HashMap. No LinkedHashMap allowed. Every pointer operation manually.",
          goal: "Unit test: get moves node to head, put evicts LRU tail at capacity. All pointer updates correct.",
        },
        lc: { number: 435, name: "Non-Overlapping Intervals", difficulty: "Medium", freq: 4, why: "THIS IS ConflictResolver. Sort by endTime, keep earliest-ending. Minimum removals. Activity Selection Problem." },
      },
      {
        day: 4, label: "Thu",
        coding: {
          phase: "Ph 13", task: "LFU Cache + CachingFilter",
          details: [
            "LFUCache: Map<K,V> vals + Map<K,Integer> freqs + Map<Integer, LinkedHashSet<K>> freqBuckets + int minFreq",
            "LFU get: increment freq, move to new bucket, update minFreq if old bucket empty",
            "LFU put: if at capacity → evict first from freqBuckets[minFreq]. Insert new with freq=1, minFreq=1.",
            "CachingFilter: intercept GET /api/v1/analytics/** with TTL=5s and GET /leaderboard with TTL=2s",
          ],
          claudeCode: "Implement LFU cache with three HashMaps and minFreq tracking. Wire CachingFilter for analytics endpoints.",
          goal: "LFU evicts least-frequently-used correctly. Cache hit rate 85%+ after 2min warmup in Grafana.",
        },
        lc: { number: 53, name: "Maximum Subarray (Kadane's)", difficulty: "Medium", freq: 5, why: "Kadane's — greedy keep running sum if positive. Max event processing window. Foundation of greedy pattern." },
      },
      {
        day: 5, label: "Fri",
        coding: {
          phase: "Ph 14", task: "Trie autocomplete + Union-Find",
          details: [
            "TrieNode: Map<Character,TrieNode> children, boolean isEnd, long frequency, List<String> topK (size 5)",
            "EventTypeTrie: insert(word, freq) maintaining topK sorted at each node. autocomplete(prefix, k): traverse → O(L).",
            "UnionFind: int[] parent, int[] rank. find(x): path compression. union(a,b): by rank.",
            "SourceNetworkManager: addConnection(a,b) union. sameNetwork(a,b) find compare. getNetworks() group by root.",
          ],
          claudeCode: "Trie with top-K at each node for O(L) autocomplete. UnionFind with path compression and union by rank.",
          goal: "autocomplete('pay', 3) returns top 3 payment event types. sameNetwork() returns correct groups.",
        },
        lc: { number: 146, name: "LRU Cache", difficulty: "Medium", freq: 5, why: "THIS IS LRUCache — you implemented it Tuesday. Solve it again as pure algorithm. Every pointer update from memory. Must do in 20min." },
      },
      {
        day: 6, label: "Sat",
        coding: {
          phase: "Ph 14", task: "Network endpoints + integration",
          details: [
            "GET /api/v1/events/types/autocomplete?prefix=pay&k=5 — populate Trie from event history on startup",
            "POST /api/v1/sources/connections — union two sources",
            "GET /api/v1/sources/networks → [{networkId, members:[...], size}]",
            "Integration tests for autocomplete and network endpoints",
          ],
          claudeCode: "Wire autocomplete and network REST endpoints. @PostConstruct to populate Trie from event type frequencies in PostgreSQL.",
          goal: "Autocomplete returns real data from DB. Network grouping correct on test sources.",
        },
        lc: [
          { number: 55,  name: "Jump Game", difficulty: "Medium", freq: 4, why: "Greedy max reach — track furthest index reachable. Same feasibility thinking as CapacityOptimizer (Ph7)." },
          { number: 208, name: "Implement Trie", difficulty: "Medium", freq: 3, why: "Build TrieNode from scratch — TrieNode[26] + isEnd. Base of EventTypeTrie you build this evening." },
          { number: 323, name: "Number of Connected Components", difficulty: "Medium", freq: 4, why: "Union-Find groups — THIS IS SourceNetworkManager. Classic Union-Find application." },
          { number: 684, name: "Redundant Connection", difficulty: "Medium", freq: 3, why: "Union-Find cycle detection — detectRedundantConnection() in Ph14. If sameNetwork before union → redundant." },
        ],
      },
      {
        day: 7, label: "Sun",
        coding: null,
        lc: [
          { number: 45,  name: "Jump Game II — NEW",     difficulty: "Medium", freq: 4, why: "Min jumps greedy — track current and next boundary. Extension of LC55." },
          { number: 134, name: "Gas Station — NEW",      difficulty: "Medium", freq: 4, why: "Circular greedy — if total gas >= total cost a solution exists. Common Amazon question." },
          { number: 763, name: "Partition Labels — NEW", difficulty: "Medium", freq: 4, why: "Greedy intervals — find last occurrence of each char, extend window. Combines greedy + interval thinking." },
        ],
        note: "3 greedy gap problems. Completes the greedy pattern. Then re-solve LC146 timed 20min. That's your Week 7 benchmark.",
      },
    ],
  },
  {
    week: 7, theme: "Hard Benchmarks + Deploy + Mock Interviews", color: "#fbbf24",
    month: 3, phasesCovered: "Ph 15 · Dockerfile + CI/CD + Gatling + GCP", lcPattern: "Hard Review + Benchmarks",
    days: [
      {
        day: 1, label: "Mon",
        coding: {
          phase: "Ph 15", task: "Dockerfile + GCP setup",
          details: [
            "Multi-stage Dockerfile: eclipse-temurin:21 builder → gcr.io/distroless/java21 runner",
            "JVM flags: -XX:+UseZGC -XX:MaxRAMPercentage=75 -XX:+UseContainerSupport",
            "Non-root USER in Dockerfile (distroless nonroot)",
            "GCP: create project, enable Cloud Run + Artifact Registry APIs, service account with roles",
          ],
          claudeCode: "Generate production Dockerfile: multi-stage, distroless base, non-root user, ZGC flags for low-latency.",
          goal: "docker build succeeds. docker run :8080 starts. /health returns 200.",
        },
        lc: { number: 295, name: "Find Median from Data Stream — TIMED 25min", difficulty: "Hard", freq: 5, why: "Benchmark. Two heaps from memory. No hints. If >25min your two-heap pattern is not owned yet." },
      },
      {
        day: 2, label: "Tue",
        coding: {
          phase: "Ph 15", task: "GitHub Actions CI/CD pipeline",
          details: [
            "GitHub Actions workflow: on push main → mvn test → docker build → push Artifact Registry → gcloud run deploy",
            "GCP Secret Manager: store DB password, Redis URL, Kafka bootstrap",
            "Cloud Run service: min-instances=1, max-instances=3, 2GB RAM, --set-secrets flags",
            "Verify: push to main → pipeline runs → app auto-deployed to live URL",
          ],
          claudeCode: "Generate GitHub Actions workflow: test → docker build → push GCR → deploy Cloud Run with secrets from Secret Manager.",
          goal: "Push to main → GitHub Actions deploys automatically. Live Cloud Run URL accessible.",
        },
        lc: { number: 239, name: "Sliding Window Maximum — TIMED 25min", difficulty: "Hard", freq: 4, why: "Benchmark. Monotonic deque from memory. This is MonotonicDequeAnalyzer — you built it. Should be fast." },
      },
      {
        day: 3, label: "Wed",
        coding: {
          phase: "Ph 15", task: "Gatling load test",
          details: [
            "StreamForgeSimulation: 500 virtual users, rampUsers(500).during(60), steadyState 300s, rampDown 30s",
            "Scenarios: POST /events (70%), GET /leaderboard (20%), GET /analytics/latency (10%)",
            "Assertions: global().responseTime().percentile(99).lt(20), failedRequests().percent().lt(0.1)",
            "Run WITHOUT cache first → record P99. Enable cache → run again. Document improvement.",
          ],
          claudeCode: "Generate Gatling simulation with 500 users, mixed scenarios, P99 < 20ms assertion.",
          goal: "Gatling completes. P99 documented with and without cache. Numbers ready for resume.",
        },
        lc: { number: 72, name: "Edit Distance — TIMED 30min", difficulty: "Hard", freq: 5, why: "Benchmark. Build DP table from memory. Explain recurrence out loud. ConfigDiffEngine — you built it." },
      },
      {
        day: 4, label: "Thu",
        coding: {
          phase: "Ph 15", task: "README + architecture diagram",
          details: [
            "Architecture diagram: all 15 phases + data flow (Excalidraw or draw.io — export as PNG)",
            "README: project overview, all API endpoints table, tech stack, Gatling P99 screenshot",
            "Document: cache hit rate %, dedup ratio %, spike detection example",
            "Add live Cloud Run URL to README header",
          ],
          claudeCode: "Generate comprehensive README with project overview, complete endpoints table, tech stack section, and deployment instructions.",
          goal: "README complete with real numbers. GitHub repo public and looks professional.",
        },
        lc: { number: 23, name: "Merge K Sorted Lists", difficulty: "Hard", freq: 5, why: "Min-heap with (value, source_index) pairs. O(N log K). Merging K sorted event streams from multiple Kafka partitions." },
      },
      {
        day: 5, label: "Fri",
        coding: {
          phase: "Ph 15", task: "Final smoke test + apply",
          details: [
            "Smoke test all 15 phase endpoints on live Cloud Run URL",
            "Fix any production issues found",
            "Update Job Hunt Command Center: mark Ph15 complete, apply to next target company",
            "LinkedIn: add StreamForge to Experience/Projects with live URL and Gatling numbers",
          ],
          claudeCode: null,
          goal: "All endpoints returning correct responses on live URL. Project complete. Applied to next company.",
        },
        lc: [
          { number: 207, name: "Course Schedule — TIMED 20min",  difficulty: "Medium", freq: 5, why: "Benchmark. Three-color DFS cold. CycleDetector — you built it. 20min target." },
          { number: 146, name: "LRU Cache — TIMED 20min",        difficulty: "Medium", freq: 5, why: "Benchmark. Every pointer update from memory. This is your FAANG calibration problem." },
        ],
      },
      {
        day: 6, label: "Sat",
        coding: null,
        lc: [
          { number: 98,  name: "Validate BST — NEW",                 difficulty: "Medium", freq: 5, why: "BST bounds propagation — DFS with min/max bounds. Visa asks this. Hierarchy invariant checking." },
          { number: 297, name: "Serialize/Deserialize Tree — NEW",   difficulty: "Hard",   freq: 5, why: "BFS encoding. THIS IS your Kafka tree snapshot from Ph8. You built the production version." },
          { number: 4,   name: "Median of Two Sorted Arrays — NEW",  difficulty: "Hard",   freq: 4, why: "Google favorite. Binary search on shorter array. O(log(m+n)). Hardest BS problem." },
        ],
        note: "Mock interview day. Timed 30min each. Talk out loud entire time. No hints. Treat as real interview.",
      },
      {
        day: 7, label: "Sun",
        coding: null,
        lc: [
          { number: 139, name: "Word Break — NEW",           difficulty: "Medium", freq: 4, why: "1D DP + string. Common Meta question. dp[i] = any j where dp[j] and word[j..i] in dict." },
          { number: 25,  name: "Reverse Nodes in K-Group — NEW", difficulty: "Hard", freq: 4, why: "Final challenge. Recursive pointer reversal in groups of K. Hard LL — tests full pointer mastery." },
        ],
        note: "Final day. 2 problems — no time pressure. Project is deployed. Resume bullet is real. You are ready to interview.",
      },
    ],
  },
];

const DIFF_COLORS = { Easy: "#34d399", Medium: "#fbbf24", Hard: "#f87171" };
const STORAGE_KEY = "daily-plan-v3";
function load() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } }
function save(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

export default function App() {
  const [state, setState] = useState({});
  const [openWeek, setOpenWeek] = useState(1);
  const [openDay, setOpenDay] = useState(null);
  const [weekFilter, setWeekFilter] = useState(0);

  useEffect(() => { setState(load()); }, []);
  const toggle = (key) => { const next = { ...state, [key]: !state[key] }; setState(next); save(next); };

  const getLCs = (day) => Array.isArray(day.lc) ? day.lc : day.lc ? [day.lc] : [];

  const getDayProgress = (week, day) => {
    const lcs = getLCs(day);
    const codingTasks = day.coding?.details?.length || 0;
    const total = lcs.length + codingTasks;
    if (total === 0) return { done: 0, total: 0, pct: 0 };
    const lcDone = lcs.filter(lc => state[`lc_w${week.week}_${lc.number}`]).length;
    const codeDone = day.coding?.details?.filter((_, i) => state[`code_w${week.week}_d${day.day}_${i}`]).length || 0;
    return { done: lcDone + codeDone, total, pct: Math.round(((lcDone + codeDone) / total) * 100) };
  };

  const getWeekProgress = (week) => {
    let done = 0, total = 0;
    week.days.forEach(day => { const p = getDayProgress(week, day); done += p.done; total += p.total; });
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const overall = SCHEDULE.reduce((a, w) => { const p = getWeekProgress(w); return { done: a.done + p.done, total: a.total + p.total }; }, { done: 0, total: 0 });
  const overallPct = Math.round((overall.done / overall.total) * 100);

  const filtered = weekFilter === 0 ? SCHEDULE : SCHEDULE.filter(w => w.week === weekFilter);

  return (
    <div style={{ minHeight: "100vh", background: "#020617", padding: "20px 14px", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid #0f172a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ color: "#1e3a5f", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.2em", marginBottom: 5 }}>7 WEEKS · 76 PROBLEMS · 71% ROADMAP · 100% PROJECT SYNCED</div>
              <h1 style={{ color: "#f8fafc", fontSize: 26, fontWeight: 700, margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.025em" }}>Daily Grind</h1>
              <p style={{ color: "#334155", fontSize: 12, margin: "5px 0 0", fontFamily: "'IBM Plex Mono', monospace" }}>StreamForge build + LeetCode — every problem mirrors same-day project code</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 9, padding: "10px 16px", textAlign: "center" }}>
                <div style={{ color: "#38bdf8", fontSize: 11, fontFamily: "monospace", marginBottom: 3 }}>OVERALL</div>
                <div style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>{overallPct}<span style={{ fontSize: 14, color: "#334155" }}>%</span></div>
                <div style={{ background: "#0a0f1a", borderRadius: 5, height: 4, marginTop: 6, overflow: "hidden", width: 80 }}>
                  <div style={{ width: `${overallPct}%`, height: "100%", background: "linear-gradient(90deg,#38bdf8,#a78bfa,#fbbf24)", borderRadius: 5, transition: "width 0.5s" }} />
                </div>
              </div>
              {SCHEDULE.map(w => {
                const { pct } = getWeekProgress(w);
                return (
                  <div key={w.week} onClick={() => { setWeekFilter(weekFilter === w.week ? 0 : w.week); setOpenWeek(w.week); }}
                    style={{ background: weekFilter === w.week ? w.color + "18" : "#0a0f1a", border: `1px solid ${weekFilter === w.week ? w.color + "55" : "#1e293b"}`, borderRadius: 9, padding: "8px 10px", textAlign: "center", cursor: "pointer", transition: "all 0.15s", minWidth: 50 }}>
                    <div style={{ color: w.color, fontSize: 10, fontFamily: "monospace", marginBottom: 2 }}>W{w.week}</div>
                    <div style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>{pct}<span style={{ fontSize: 10, color: "#334155" }}>%</span></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={{ background: "#0a0f1a", borderRadius: 5, height: 4 }}>
              <div style={{ width: `${overallPct}%`, height: "100%", background: "linear-gradient(90deg,#38bdf8,#a78bfa)", borderRadius: 5, transition: "width 0.5s" }} />
            </div>
            <div style={{ background: "#0a0f1a", borderRadius: 5, height: 4 }}>
              <div style={{ width: `${overallPct}%`, height: "100%", background: "linear-gradient(90deg,#34d399,#fbbf24)", borderRadius: 5, transition: "width 0.5s" }} />
            </div>
          </div>
        </div>

        {/* DAILY RULE */}
        <div style={{ background: "#0a0f1a", border: "1px solid #f9731622", borderLeft: "3px solid #f97316", borderRadius: 9, padding: "12px 16px", marginBottom: 18 }}>
          <div style={{ color: "#f97316", fontSize: 10, fontFamily: "monospace", fontWeight: 700, marginBottom: 6 }}>THE RULE — NON NEGOTIABLE</div>
          <p style={{ color: "#64748b", fontSize: 12, margin: 0, lineHeight: 1.8 }}>
            <span style={{ color: "#94a3b8" }}>Morning 45min →</span> LC problem. 25min attempt no peeking. 20min understand WHY.{" "}
            <span style={{ color: "#94a3b8" }}>Evening 90min →</span> Project coding tasks.{" "}
            <span style={{ color: "#94a3b8" }}>Saturday →</span> Extra LC problems + integration work.{" "}
            <span style={{ color: "#94a3b8" }}>Sunday →</span> NEW gap problems + RETIME re-solves. Light day.{" "}
            <span style={{ color: "#475569" }}>Slow day beats skipped day every time.</span>
          </p>
        </div>

        {/* WEEK FILTER */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => setWeekFilter(0)} style={{ background: weekFilter === 0 ? "#1e293b" : "#0a0f1a", color: weekFilter === 0 ? "#f1f5f9" : "#334155", border: `1px solid ${weekFilter === 0 ? "#334155" : "#1e293b"}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>All</button>
          {SCHEDULE.map(w => (
            <button key={w.week} onClick={() => { setWeekFilter(weekFilter === w.week ? 0 : w.week); setOpenWeek(w.week); }}
              style={{ background: weekFilter === w.week ? w.color + "18" : "#0a0f1a", color: weekFilter === w.week ? w.color : "#334155", border: `1px solid ${weekFilter === w.week ? w.color + "55" : "#1e293b"}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
              W{w.week}
            </button>
          ))}
        </div>

        {/* WEEK CARDS */}
        {filtered.map(week => {
          const { done, total, pct } = getWeekProgress(week);
          const isOpen = openWeek === week.week;

          return (
            <div key={week.week} style={{ marginBottom: 10, border: `1px solid ${isOpen ? week.color + "55" : "#1e293b"}`, borderLeft: `3px solid ${week.color}`, borderRadius: 11, overflow: "hidden" }}>
              <div onClick={() => setOpenWeek(isOpen ? null : week.week)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", cursor: "pointer", background: isOpen ? "#060d18" : "#0a0f1a" }}>
                <div style={{ minWidth: 48, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ color: week.color, fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>WK {week.week}</div>
                  <div style={{ color: pct === 100 ? "#34d399" : pct > 0 ? week.color : "#334155", fontSize: 13, fontFamily: "monospace", fontWeight: 700, marginTop: 2 }}>{pct}%</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>{week.theme}</span>
                    <span style={{ background: week.color + "18", color: week.color, border: `1px solid ${week.color}33`, borderRadius: 4, fontSize: 10, padding: "1px 7px", fontFamily: "monospace" }}>{week.lcPattern}</span>
                  </div>
                  <div style={{ color: "#334155", fontSize: 11, marginTop: 2 }}>{week.phasesCovered} · M{week.month}</div>
                </div>
                <div style={{ display: "flex", gap: 12, flexShrink: 0, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#334155", fontSize: 9, fontFamily: "monospace" }}>DONE</div>
                    <div style={{ color: done === total ? "#34d399" : pct > 0 ? week.color : "#334155", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{done}/{total}</div>
                  </div>
                  <span style={{ color: "#334155" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
              <div style={{ height: 2, background: "#0a0f1a" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#34d399" : week.color, transition: "width 0.4s" }} />
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid #1e293b" }}>
                  {week.days.map(day => {
                    const dayKey = `day_${week.week}_${day.day}`;
                    const isDayOpen = openDay === dayKey;
                    const { done: dDone, total: dTotal, pct: dPct } = getDayProgress(week, day);
                    const lcs = getLCs(day);
                    const isWeekend = day.day >= 6;

                    return (
                      <div key={day.day} style={{ borderBottom: "1px solid #0f172a", background: isWeekend ? "#08101a" : "#060d1a" }}>
                        <div onClick={() => setOpenDay(isDayOpen ? null : dayKey)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", cursor: "pointer", userSelect: "none" }}>
                          <div style={{ width: 36, height: 36, borderRadius: 7, background: dPct === 100 ? "#052e1c" : isWeekend ? week.color + "10" : "#0a1120", border: `1px solid ${dPct === 100 ? "#34d399" : week.color + "22"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: dPct === 100 ? "#34d399" : week.color, fontSize: 9, fontFamily: "monospace", lineHeight: 1 }}>{day.label}</span>
                            <span style={{ color: dPct === 100 ? "#34d399" : "#334155", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{dPct === 100 ? "✓" : `${dPct}%`}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}>
                              {day.coding ? `⚡ ${day.coding.task}` : day.note ? `📖 ${day.note.split(".")[0]}` : "Rest"}
                            </div>
                            <div style={{ color: "#1e3a5f", fontSize: 10, marginTop: 2 }}>
                              {lcs.length > 0 && `LC: ${lcs.map(l => `#${l.number}`).join(", ")}`}
                            </div>
                          </div>
                          <span style={{ color: "#334155" }}>{isDayOpen ? "▲" : "▼"}</span>
                        </div>

                        {isDayOpen && (
                          <div style={{ borderTop: `1px solid ${week.color}18`, padding: "12px 13px 14px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: day.coding ? "1fr 1fr" : "1fr", gap: 12 }}>

                              {/* CODING SECTION */}
                              {day.coding && (
                                <div>
                                  <div style={{ color: "#38bdf8", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 8 }}>⚡ CODING — {day.coding.phase}</div>
                                  <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>{day.coding.task}</div>
                                  {day.coding.details.map((detail, i) => {
                                    const taskKey = `code_w${week.week}_d${day.day}_${i}`;
                                    const isDone = !!state[taskKey];
                                    return (
                                      <div key={i} onClick={() => toggle(taskKey)}
                                        style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 9px", marginBottom: 4, borderRadius: 6, cursor: "pointer", background: isDone ? "#071a0d" : "#020617", border: `1px solid ${isDone ? "#34d39918" : "#1e293b"}`, transition: "all 0.12s" }}>
                                        <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, marginTop: 1, background: isDone ? "#34d399" : "transparent", border: `2px solid ${isDone ? "#34d399" : "#2d3f55"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}>
                                          {isDone && <span style={{ color: "#020617", fontSize: 8, fontWeight: 900 }}>✓</span>}
                                        </div>
                                        <span style={{ color: isDone ? "#1e3a5f" : "#64748b", fontSize: 11, lineHeight: 1.55, textDecoration: isDone ? "line-through" : "none", fontFamily: "monospace" }}>{detail}</span>
                                      </div>
                                    );
                                  })}
                                  {day.coding.claudeCode && (
                                    <div style={{ marginTop: 8, background: "#0a1d40", border: "1px solid #2563eb22", borderRadius: 6, padding: "7px 10px" }}>
                                      <div style={{ color: "#60a5fa", fontSize: 9, letterSpacing: "0.06em", marginBottom: 3, fontFamily: "monospace" }}>🤖 CLAUDE CODE</div>
                                      <p style={{ color: "#374151", fontSize: 10, margin: 0, lineHeight: 1.5 }}>{day.coding.claudeCode}</p>
                                    </div>
                                  )}
                                  <div style={{ marginTop: 8, background: "#052e1c", border: "1px solid #34d39918", borderRadius: 6, padding: "7px 10px" }}>
                                    <div style={{ color: "#34d399", fontSize: 9, letterSpacing: "0.06em", marginBottom: 3, fontFamily: "monospace" }}>✓ GOAL</div>
                                    <p style={{ color: "#374151", fontSize: 10, margin: 0, lineHeight: 1.5 }}>{day.coding.goal}</p>
                                  </div>
                                </div>
                              )}

                              {/* LEETCODE SECTION */}
                              <div>
                                <div style={{ color: "#fbbf24", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 8 }}>🧮 LEETCODE</div>
                                {day.note && isWeekend && (
                                  <div style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                                    <p style={{ color: "#475569", fontSize: 11, margin: 0, lineHeight: 1.6 }}>{day.note}</p>
                                  </div>
                                )}
                                {lcs.map((lc, i) => {
                                  const lcKey = `lc_w${week.week}_${lc.number}`;
                                  const isDone = !!state[lcKey];
                                  const isNew = lc.why?.startsWith("NEW") || lc.why?.includes("— NEW") || lc.name?.includes("NEW");
                                  const isRetime = lc.name?.includes("RE-SOLVE") || lc.name?.includes("TIMED") || lc.why?.includes("Benchmark") || lc.why?.includes("Re-solve");
                                  const lcPath = lc.name.replace(/ —.*$/, "").replace(/[^a-z0-9 ]/gi, "").trim().toLowerCase().replace(/\s+/g, "-");
                                  return (
                                    <div key={lc.number} style={{ marginBottom: 6, borderRadius: 7, overflow: "hidden", border: `1px solid ${isDone ? "#34d39925" : "#1e293b"}`, background: isDone ? "#071a0d" : "#020617" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px" }}>
                                        <div onClick={() => toggle(lcKey)}
                                          style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: isDone ? "#34d399" : "transparent", border: `2px solid ${isDone ? "#34d399" : "#2d3f55"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.12s" }}>
                                          {isDone && <span style={{ color: "#020617", fontSize: 8, fontWeight: 900 }}>✓</span>}
                                        </div>
                                        <a href={`https://leetcode.com/problems/${lcPath}/`} target="_blank" rel="noreferrer"
                                          style={{ color: "#f89820", fontSize: 10, fontFamily: "monospace", fontWeight: 700, textDecoration: "none", flexShrink: 0, minWidth: 36 }}>
                                          #{lc.number}
                                        </a>
                                        <span style={{ color: isDone ? "#1e3a5f" : "#e2e8f0", fontSize: 11, fontFamily: "monospace", flex: 1, textDecoration: isDone ? "line-through" : "none" }}>
                                          {lc.name.replace(/ — (RE-SOLVE|NEW|TIMED).*$/, "")}
                                        </span>
                                        <span style={{ background: DIFF_COLORS[lc.difficulty] + "18", color: DIFF_COLORS[lc.difficulty], border: `1px solid ${DIFF_COLORS[lc.difficulty]}33`, borderRadius: 3, fontSize: 9, padding: "1px 5px", fontFamily: "monospace", flexShrink: 0 }}>{lc.difficulty}</span>
                                        {isNew && <span style={{ background: "#38bdf822", color: "#38bdf8", border: "1px solid #38bdf833", borderRadius: 3, fontSize: 9, padding: "1px 5px", fontFamily: "monospace", flexShrink: 0 }}>NEW</span>}
                                        {isRetime && <span style={{ background: "#fbbf2418", color: "#fbbf24", border: "1px solid #fbbf2433", borderRadius: 3, fontSize: 9, padding: "1px 5px", fontFamily: "monospace", flexShrink: 0 }}>⏱</span>}
                                      </div>
                                      <div style={{ padding: "0 10px 8px 32px" }}>
                                        <p style={{ color: "#475569", fontSize: 11, margin: 0, lineHeight: 1.55 }}>{lc.why}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* FOOTER */}
        <div style={{ marginTop: 18, padding: "12px 16px", background: "#0a0f1a", borderRadius: 9, border: "1px solid #1e293b" }}>
          <div style={{ color: "#334155", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 10 }}>READINESS MILESTONES</div>
          {[
            { w: "Week 4", company: "Stripe · Affirm · Brex", color: "#34d399", note: "Arrays, Two Pointers, Sliding Window, Stack, BS, Trees, Heaps. System design covered by Ph1–9." },
            { w: "Week 6", company: "Visa · Amazon · Microsoft", color: "#fbbf24", note: "+ Graphs, DP, Intervals, Cache, Trie, Greedy. Full DSA. Ph10–14 deployed." },
            { w: "Week 7", company: "Google · Netflix", color: "#f87171", note: "+ Hard benchmarks timed. All patterns. Project live on GCP. P99 numbers documented." },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 7, padding: "9px 11px", background: "#020617", borderRadius: 7, border: `1px solid ${m.color}18`, borderLeft: `3px solid ${m.color}` }}>
              <div style={{ minWidth: 60 }}>
                <div style={{ color: m.color, fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{m.w}</div>
                <div style={{ color: m.color, fontSize: 9, fontFamily: "monospace", marginTop: 2 }}>{m.company}</div>
              </div>
              <p style={{ color: "#475569", fontSize: 11, margin: 0, lineHeight: 1.55 }}>{m.note}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
