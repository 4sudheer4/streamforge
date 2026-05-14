package com.streamforge.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamforge.engine.TopKEventTracker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class EventIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TopKEventTracker topKEventTracker;

    @BeforeEach
    void resetTracker() {
        topKEventTracker.reset();
    }

    @Test
    void topK_shouldReturnCorrectRanking_after50Events() throws Exception {
        postEvents("payment", 20);
        postEvents("login", 15);
        postEvents("sms", 10);
        postEvents("transfer", 3);
        postEvents("refund", 2);

        mockMvc.perform(get("/api/v1/analytics/top-events?k=3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.results[0].type").value("payment"))
            .andExpect(jsonPath("$.results[0].rank").value(1))
            .andExpect(jsonPath("$.results[1].type").value("login"))
            .andExpect(jsonPath("$.results[1].rank").value(2))
            .andExpect(jsonPath("$.results[2].type").value("sms"))
            .andExpect(jsonPath("$.results[2].rank").value(3));
    }

    @Test
    void dedup_shouldReturn208_onDuplicateEvent() throws Exception {
        String fixedId = "550e8400-e29b-41d4-a716-446655440000";
        String body = buildEvent(fixedId, "source-001", "payment",
            Map.of("amount", 100), "2024-01-15T10:00:00Z");

        mockMvc.perform(post("/api/v1/events")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/events")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
            .andExpect(status().isAlreadyReported());
    }

    private void postEvents(String type, int count) throws Exception {
        for (int i = 0; i < count; i++) {
            String body = buildEvent(
                UUID.randomUUID().toString(),
                "source-001",
                type,
                Map.of("index", i),
                Instant.now().toString()
            );
            mockMvc.perform(post("/api/v1/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk());
        }
    }

    private String buildEvent(String id, String sourceId, String type,
                               Map<String, Object> payload, String timestamp)
                               throws Exception {
        return objectMapper.writeValueAsString(Map.of(
            "id", id,
            "sourceId", sourceId,
            "type", type,
            "payload", payload,
            "timestamp", timestamp,
            "fingerprint", ""
        ));
    }
}
