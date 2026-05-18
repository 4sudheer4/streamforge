package com.streamforge.infra;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.streamforge.infra.RateLimitResult;

import java.io.IOException;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final SlidingWindowRateLimiter rateLimiter;

    public RateLimitFilter(SlidingWindowRateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Step 1 — who is making this request?
        String sourceId = request.getHeader("X-Source-Id");

        if (sourceId == null || sourceId.isBlank()) {
            response.setStatus(400);
            response.setContentType("application/json");
            response.getWriter().write("""
                {"error": "missing_source_id", "message": "X-Source-Id header is required"}
            """);
            return; // stop here — don't call filterChain
        }

        // Step 2 — has this source exceeded their limit?
        RateLimitResult result = rateLimiter.tryAcquire(sourceId);

        if (!result.allowed()) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("""
                {
                    "error": "rate_limit_exceeded",
                    "retryAfter": 60,
                    "limit": 100,
                    "window": "60s"
                }
            """);
            return; // stop here — don't call filterChain
        }

        // Step 3 — allowed, add headers and pass through
        response.setHeader("X-RateLimit-Limit", "100");
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.remaining()));
        response.setHeader("X-RateLimit-Reset", 
            String.valueOf(System.currentTimeMillis() + 60_000));

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return path.startsWith("/api/v1/analytics") || 
           path.startsWith("/actuator") ||
           path.equals("/health");
}
}