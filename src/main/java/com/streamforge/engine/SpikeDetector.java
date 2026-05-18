// src/main/java/com/streamforge/engine/SpikeDetector.java
package com.streamforge.engine;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Component
@RequiredArgsConstructor
public class SpikeDetector {

    private static final double SPIKE_MULTIPLIER = 3.0;
    private static final String ANOMALIES_TOPIC = "anomalies";

    private final MonotonicDequeAnalyzer analyzer;
    private final KafkaTemplate<String, String> kafkaTemplate;

    private final Map<String, AtomicLong> currentBucketCount
        = new ConcurrentHashMap<>();

    // called on every incoming event
    public void trackEvent(String sourceId) {
        currentBucketCount
            .computeIfAbsent(sourceId, k -> new AtomicLong(0))
            .incrementAndGet();
    }

    @Scheduled(fixedRate = 1000)
    public void flushBuckets() {
        currentBucketCount.forEach((sourceId, counter) -> {

            // get count for this second and reset to 0 atomically
            long count = counter.getAndSet(0);

            // tell analyzer about this second's bucket
            analyzer.record(sourceId, count);

            // get stats from analyzer
            long maxInWindow = analyzer.getMaxInWindow(sourceId);
            double rollingAvg = analyzer.getRollingAvg(sourceId);

            // spike check — need at least some baseline before alerting
            if (rollingAvg > 0 && count > SPIKE_MULTIPLIER * rollingAvg) {
                double multiplier = count / rollingAvg;
                log.warn("SPIKE detected for sourceId={} count={} rollingAvg={} multiplier={}x",
                    sourceId, count, rollingAvg, String.format("%.1f", multiplier));

                // publish spike event to anomalies topic
                String spikePayload = String.format(
                    "{\"sourceId\":\"%s\",\"count\":%d,\"rollingAvg\":%.1f,\"multiplier\":%.1fx,\"timestamp\":\"%s\"}",
                    sourceId, count, rollingAvg, multiplier, Instant.now()
                );
                kafkaTemplate.send(ANOMALIES_TOPIC, sourceId, spikePayload);
            }
        });
    }
}