package com.streamforge.engine;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamforge.domain.EventResult;
import com.streamforge.domain.StreamEvent;
import com.streamforge.domain.ValidationResult;
import com.streamforge.infra.StreamEventRepository;
import com.streamforge.infra.StreamEventEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Optional;
import com.streamforge.infra.EventKafkaProducer;

import java.util.UUID;
@Slf4j
@Service  // same as @Component but semantically means "this is a service layer class"
@RequiredArgsConstructor
public class EventIngestionService {
    private final DeduplicationEngine deduplicationEngine;
    private final StreamEventRepository repository;  // JPA repository — talks to PostgreSQL
    private final TopKEventTracker topKEventTracker;
    private final EventKafkaProducer eventKafkaProducer; 
    private final SpikeDetector spikeDetector;
    private final JsonStructureValidator jsonStructureValidator;
    private final ObjectMapper objectMapper;

    public EventResult ingest(StreamEvent event) {
        log.info("ingest called for sourceId={}", event.sourceId());
        try {
        String payloadJson = objectMapper.writeValueAsString(event.payload());
        ValidationResult validation = jsonStructureValidator.validate(payloadJson);
        if (!validation.isValid()) {
            throw new IllegalArgumentException(validation.errorMessage());
        }
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid payload: " + e.getMessage());
        }
        topKEventTracker.record(event.type());
        spikeDetector.trackEvent(event.sourceId()); 
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
            Objects.requireNonNull(event.id(), "Event id must not be null"),
            event.sourceId(),
            event.type(),
            event.payload(),
            event.timestamp(),
            event.fingerprint()
        );
        repository.save(entity);
        eventKafkaProducer.publishEvent(event);

        return new EventResult(
            entity.getId(),
            "PROCESSED",
            event.fingerprint(),
            false  // not deduplicated — this was a fresh event
        );
    }

}
