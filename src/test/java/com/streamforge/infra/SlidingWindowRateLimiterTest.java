package com.streamforge.infra;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SlidingWindowRateLimiterTest {

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    private SlidingWindowRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new SlidingWindowRateLimiter(redisTemplate);
        // Why not call init() here?
        // @PostConstruct loads the Lua script from classpath.
        // In unit test we mock execute() entirely so the script
        // never actually loads or runs. We skip init().
    }

    @Test
    void allows_first_100_requests_denies_101st() {
        // First 100 → Redis says allowed
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any(), any(), any()))
            .thenReturn(1L);

        for (int i = 0; i < 100; i++) {
            assertThat(rateLimiter.tryAcquire("source-abc").allowed()).isTrue();
        }

        // 101st → Redis says denied
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any(), any(), any()))
            .thenReturn(0L);

            assertThat(rateLimiter.tryAcquire("source-abc").allowed()).isFalse();

    }
}