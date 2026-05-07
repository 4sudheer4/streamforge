package com.streamforge.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamforge.domain.StreamEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.TreeMap;

@Component
@RequiredArgsConstructor
public class FingerprintGenerator {
    private final ObjectMapper objectMapper;

    // 5 minutes in milliseconds — the dedup window
    private static final long WINDOW_MS = 5 * 60 * 1000L;
    public String generate(StreamEvent event) {
        try {
            // Floor timestamp to 5-min bucket
            // e.g. 10:03:47 and 10:07:12 → same bucket (10:00:00)
            // e.g. 10:03:47 and 10:06:00 → different buckets
            long bucket = (event.timestamp().toEpochMilli() / WINDOW_MS) * WINDOW_MS;

            // Sort payload keys → deterministic JSON regardless of insertion order
            var sortedPayload = new TreeMap<>(event.payload()); //returns sorted JAVA Map. sorts top level keys alphabatically and returns
            String payloadJson = objectMapper.writeValueAsString(sortedPayload);

            // | separators prevent accidental collisions like
            // sourceId="AB" + type="CDE" vs sourceId="ABC" + type="DE"
            String raw = event.sourceId() + "|" + event.type() + "|" + payloadJson + "|" + bucket;

            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash); // 64-char hex string

        } catch (Exception e) {
            throw new RuntimeException("Fingerprint generation failed", e);
        }

    }
}
