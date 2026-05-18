package com.streamforge.domain;

import java.time.Instant;

public record RequestBucket(Instant timestamp, long requestCount) {}