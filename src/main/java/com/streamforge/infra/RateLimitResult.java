package com.streamforge.infra;

public record RateLimitResult(boolean allowed, long remaining) {}