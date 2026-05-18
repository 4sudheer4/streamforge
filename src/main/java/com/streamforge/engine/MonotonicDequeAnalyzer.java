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
    private final Map<String, Deque<RequestBucket>> avgDeques
        = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> avgTotals
        = new ConcurrentHashMap<>();

    public void record(String sourceId, long requestCount) {
        Deque<RequestBucket> deque = sourceDeques
            .computeIfAbsent(sourceId, k -> new ArrayDeque<>());
        Deque<RequestBucket> avgDeque = avgDeques
            .computeIfAbsent(sourceId, k -> new ArrayDeque<>());
        AtomicLong avgTotal = avgTotals
            .computeIfAbsent(sourceId, k -> new AtomicLong(0));

        Instant now = Instant.now();
        Instant windowStart = now.minusMillis(WINDOW_MS);

        // 1. pop source front while expired
        while (!deque.isEmpty() &&
               deque.peekFirst().timestamp().isBefore(windowStart)) {
                deque.pollFirst();
        }
        // 1.1 pop avg front while expired but not count
        while (!avgDeque.isEmpty() &&
        avgDeque.peekFirst().timestamp().isBefore(windowStart)) {
                avgTotal.addAndGet(-avgDeque.pollFirst().requestCount());
        }

        // 2. pop back while dominated
        while (!deque.isEmpty() &&
               deque.peekLast().requestCount() < requestCount) {
            
            deque.pollLast();
        }

        // 3. add new bucket
        deque.addLast(new RequestBucket(now, requestCount));
        avgDeque.addLast(new RequestBucket(now, requestCount));
        avgTotal.addAndGet(requestCount);
    }

    public long getMaxInWindow(String sourceId) {
        Deque<RequestBucket> deque = sourceDeques.get(sourceId);
        if (deque == null || deque.isEmpty()) return 0L;
        return deque.peekFirst().requestCount();
    }
    public int getBucketCount(String sourceId) {
        Deque<RequestBucket> avgDeque = avgDeques.get(sourceId);
        return avgDeque == null ? 0 : avgDeque.size();
    }

    public double getRollingAvg(String sourceId) {
        Deque<RequestBucket> avgDeque = avgDeques.get(sourceId);
        AtomicLong total = avgTotals.get(sourceId);
        if (avgDeque == null || avgDeque.isEmpty()) return 0.0;
        return (double) total.get() / avgDeque.size();
    }
}