package com.streamforge.domain;

import java.time.Instant;

public record SpikeStats(
    String sourceId,
    long currentRate,
    long maxInWindow,
    double rollingAvg,
    long spikeCount,
    Instant lastSpikeAt
) {}
