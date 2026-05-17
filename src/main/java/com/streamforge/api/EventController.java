package com.streamforge.api;
import com.streamforge.domain.EventResult;
import com.streamforge.domain.StreamEvent;
import com.streamforge.engine.EventIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {
    private final EventIngestionService ingestionService;
    @PostMapping
    public ResponseEntity<EventResult> ingest(@RequestBody StreamEvent event){
//                                        ↑
//                         Spring creates new StreamEvent here
//                         for every single incoming request
        log.info("Received event type={} sourceId={}", event.type(), event.sourceId());

        // ensure id and timestamp are always set
        StreamEvent enriched = new StreamEvent(
            event.id() != null ? event.id() : UUID.randomUUID(),
            event.sourceId(),
            event.type(),
            event.payload(),
            event.timestamp() != null ? event.timestamp() : Instant.now(),
            event.fingerprint()
        );
        EventResult result = ingestionService.ingest(enriched);

        // 200 for new events, 208 for duplicates
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
