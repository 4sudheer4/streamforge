package com.streamforge.infra;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.SendResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamforge.domain.StreamEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.concurrent.CompletableFuture;
import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class EventKafkaProducer {

    private static final String EVENTS_TOPIC = "events";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public EventKafkaProducer(KafkaTemplate<String, String> kafkaTemplate,
                               ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void publishEvent(StreamEvent event) {
        try {
            // Step 1 — serialize StreamEvent → JSON String
            String jsonPayload = objectMapper.writeValueAsString(event);

            // Step 2 — send to Kafka, sourceId as key
            CompletableFuture<SendResult<String, String>> future =
                kafkaTemplate.send(EVENTS_TOPIC, event.sourceId(), jsonPayload);

            // Step 3 — handle async result
            future.whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish event {} to Kafka: {}",
                        event.id(), ex.getMessage());
                } else {
                    log.debug("Published event {} to partition {}",
                        event.id(),
                        result.getRecordMetadata().partition());
                }
            });

        } catch (JsonProcessingException e) {
            log.error("Failed to serialize event {}: {}", event.id(), e.getMessage());
        }
    }
}