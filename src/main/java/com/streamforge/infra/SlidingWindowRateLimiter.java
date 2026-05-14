// src/main/java/com/streamforge/infra/SlidingWindowRateLimiter.java
package com.streamforge.infra;

import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scripting.support.ResourceScriptSource;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.List;

@Component
public class SlidingWindowRateLimiter {

    private final RedisTemplate<String, String> redisTemplate;
    private DefaultRedisScript<Long> rateLimitScript;

    // Why inject RedisTemplate and not StringRedisTemplate?
    // RedisTemplate<String,String> is what we configured in RedisConfig
    // with StringRedisSerializer on all keys/values.
    // Consistent serialization matters — mixing templates causes key mismatches.
    public SlidingWindowRateLimiter(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @PostConstruct
    public void init() {
        // Why @PostConstruct and not inline?
        // Script loading reads from classpath — doing it once at startup
        // is cheaper than loading the file on every request.
        // @PostConstruct runs after Spring wires all dependencies.
        rateLimitScript = new DefaultRedisScript<>();
        rateLimitScript.setScriptSource(
            new ResourceScriptSource(new ClassPathResource("scripts/rate_limit.lua"))
        );
        rateLimitScript.setResultType(Long.class);
    }

    public boolean tryAcquire(String sourceId) {
        String key = "rl:" + sourceId;
        long now = System.currentTimeMillis();
        long windowMs = 60_000L;
        long limit = 100L;

        Long result = redisTemplate.execute(
            rateLimitScript,
            List.of(key),        // KEYS[1]
            String.valueOf(now),         // ARGV[1]
            String.valueOf(windowMs),    // ARGV[2]
            String.valueOf(limit)        // ARGV[3]
        );

        return Long.valueOf(1L).equals(result);
    }
}