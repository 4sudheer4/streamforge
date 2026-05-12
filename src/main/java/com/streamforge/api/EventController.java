package com.streamforge.api;
import com.streamforge.domain.EventResult;
import com.streamforge.domain.StreamEvent;
import com.streamforge.engine.EventIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

        EventResult result = ingestionService.ingest(event);

        // 200 for new events, 208 for duplicates
        int statusCode = result.deduplicated() ? 208 : 200;
        return ResponseEntity.status(statusCode).body(result);
    }
}
