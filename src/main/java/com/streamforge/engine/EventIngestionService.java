package com.streamforge.engine;
import com.streamforge.domain.EventResult;
import com.streamforge.domain.StreamEvent;
import com.streamforge.infra.StreamEventRepository;
import com.streamforge.infra.StreamEventEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.Optional;

import java.util.UUID;
@Slf4j
@Service  // same as @Component but semantically means "this is a service layer class"
@RequiredArgsConstructor
public class EventIngestionService {
    private final DeduplicationEngine deduplicationEngine;
    private final StreamEventRepository repository;  // JPA repository — talks to PostgreSQL
    private final TopKEventTracker topKEventTracker;

    public EventResult ingest(StreamEvent event) {
        topKEventTracker.record(event.type());
        return deduplicationEngine.deduplicateOrProcess(
            event,
            this::persistToDatabase  // METHOD REFERENCE — same as e -> persistToDatabase(e)
        );
    }

    public Optional<StreamEventEntity> getById(UUID id) {
        return repository.findById(id);
    }

    // THIS is the processor lambda the engine calls on cache miss
    // Engine calls this ONLY if fingerprint not in cache
    private EventResult persistToDatabase(StreamEvent event){
        log.info("Persisting new event type={} sourceId={}", event.type(), event.sourceId());

        // Save to PostgreSQL via JPA
        StreamEventEntity entity = new StreamEventEntity(
            UUID.randomUUID(),
            event.sourceId(),
            event.type(),
            event.payload(),
            event.timestamp(),
            event.fingerprint()
        );
        repository.save(entity);

        return new EventResult(
            entity.getId(),
            "PROCESSED",
            event.fingerprint(),
            false  // not deduplicated — this was a fresh event
        );
    }

}
