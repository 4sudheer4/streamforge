package com.streamforge.api;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamforge.domain.EventResult;
import com.streamforge.domain.StreamEvent;
import com.streamforge.domain.ValidationResult;
import com.streamforge.engine.EventIngestionService;
import com.streamforge.engine.JsonStructureValidator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {
    private final EventIngestionService ingestionService;
    private final JsonStructureValidator jsonStructureValidator;
    private final ObjectMapper objectMapper;
    @PostMapping
    public ResponseEntity<?> ingest(@RequestBody String rawJson){
        log.info("Received raw event payload");

        // Step 1 — validate structure on raw string before Spring touches it
        ValidationResult validation = jsonStructureValidator.validate(rawJson);
        if (!validation.isValid()) {
            return ResponseEntity.badRequest().body(
                Map.of(
                    "error", "invalid_json_structure",
                    "message", validation.errorMessage(),
                    "position", validation.errorPosition()
                )
            );
        }

        // Step 2 — deserialize now that structure is valid
        StreamEvent event;
        try {
            event = objectMapper.readValue(rawJson, StreamEvent.class);
        } catch (JsonProcessingException e) {
            return ResponseEntity.badRequest().body(
                Map.of(
                    "error", "malformed_json",
                    "message", e.getMessage()
                )
            );
        }

        // Step 3 — enrich with id and timestamp
        StreamEvent enriched = new StreamEvent(
            event.id() != null ? event.id() : UUID.randomUUID(),
            event.sourceId(),
            event.type(),
            event.payload(),
            event.timestamp() != null ? event.timestamp() : Instant.now(),
            event.fingerprint()
        );

        // Step 4 — ingest
        log.info("Received event type={} sourceId={}", enriched.type(), enriched.sourceId());
        EventResult result = ingestionService.ingest(enriched);
        int statusCode = result.deduplicated() ? 208 : 200;
        return ResponseEntity.status(statusCode).body(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEventById(@PathVariable UUID id) {
        return ingestionService.getById(id)
            .map(entity -> ResponseEntity.ok(entity))
            .orElse(ResponseEntity.notFound().build());
    }

}
