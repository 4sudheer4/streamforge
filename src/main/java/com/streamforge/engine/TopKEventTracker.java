package com.streamforge.engine;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class TopKEventTracker {

    private final ConcurrentHashMap<String, AtomicLong> counts = new ConcurrentHashMap<>();

    public record TopKEntry(int rank, String type, long count, double pct) {}

    // Task 2 — O(1) count increment
    public void record(String type) {
        counts.computeIfAbsent(type, k -> new AtomicLong(0)).incrementAndGet();
    }

    // Task 3 — O(n log k) top-K retrieval
    public List<TopKEntry> getTopK(int k) {

        // total needed for pct — calculate before touching heap
        long total = counts.values().stream()
                           .mapToLong(AtomicLong::get)
                           .sum();

        // min-heap — weakest candidate always at top
        PriorityQueue<Map.Entry<String, AtomicLong>> minHeap =
            new PriorityQueue<>(
                Comparator.comparingLong(e -> e.getValue().get())
            );

        // LC #347 algorithm — offer every entry, evict smallest if size > k
        for (Map.Entry<String, AtomicLong> entry : counts.entrySet()) {
            minHeap.offer(entry);
            if (minHeap.size() > k) {
                minHeap.poll();
            }
        }

        // copy heap into list — heap is ascending, we need descending
        List<Map.Entry<String, AtomicLong>> sorted = new ArrayList<>(minHeap);
        sorted.sort((a, b) -> Long.compare(b.getValue().get(), a.getValue().get()));

        // build result with rank, type, count, pct
        List<TopKEntry> result = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            Map.Entry<String, AtomicLong> entry = sorted.get(i);
            long count = entry.getValue().get();
            double pct = total > 0
                ? Math.round((count * 100.0 / total) * 10.0) / 10.0
                : 0.0;
            result.add(new TopKEntry(i + 1, entry.getKey(), count, pct));
        }

        return result;
    }
}