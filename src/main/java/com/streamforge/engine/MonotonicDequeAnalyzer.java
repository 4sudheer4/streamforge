// src/main/java/com/streamforge/engine/MonotonicDequeAnalyzer.java
package com.streamforge.engine;

import com.streamforge.domain.RequestBucket;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class MonotonicDequeAnalyzer {

    private static final long WINDOW_MS = 60_000L;

    private final Map<String, Deque<RequestBucket>> sourceDeques
        = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> windowTotals
        = new ConcurrentHashMap<>();

    public void record(String sourceId, long requestCount) {
        Deque<RequestBucket> deque = sourceDeques
            .computeIfAbsent(sourceId, k -> new ArrayDeque<>());
        AtomicLong total = windowTotals
            .computeIfAbsent(sourceId, k -> new AtomicLong(0));

        Instant now = Instant.now();
        Instant windowStart = now.minusMillis(WINDOW_MS);

        // 1. pop front while expired
        while (!deque.isEmpty() &&
               deque.peekFirst().timestamp().isBefore(windowStart)) {
            total.addAndGet(-deque.pollFirst().requestCount());
        }

        // 2. pop back while dominated
        while (!deque.isEmpty() &&
               deque.peekLast().requestCount() <= requestCount) {
            total.addAndGet(-deque.pollLast().requestCount());
        }

        // 3. add new bucket
        deque.addLast(new RequestBucket(now, requestCount));
        total.addAndGet(requestCount);
    }

    public long getMaxInWindow(String sourceId) {
        Deque<RequestBucket> deque = sourceDeques.get(sourceId);
        if (deque == null || deque.isEmpty()) return 0L;
        return deque.peekFirst().requestCount();
    }

    public double getRollingAvg(String sourceId) {
        Deque<RequestBucket> deque = sourceDeques.get(sourceId);
        AtomicLong total = windowTotals.get(sourceId);
        if (deque == null || deque.isEmpty()) return 0.0;
        return (double) total.get() / deque.size();
    }
}