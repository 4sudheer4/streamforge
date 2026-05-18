package com.streamforge.infra;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class EventsConsumer {

    @KafkaListener(
        topics = "events",
        groupId = "streamforge-consumer"
    )
    public void consume(ConsumerRecord<String, String> record) {
        log.info("EventsConsumer received: partition={} offset={} key={} value={}",
            record.partition(),
            record.offset(),
            record.key(),
            record.value());

        // simulate processing failure for testing DLQ
        // remove this after DLQ is verified
        if (record.value().contains("\"type\":\"payment\"")) {
            throw new RuntimeException("Simulated processing failure for DLQ test");
        }

        log.info("EventsConsumer processed event key={}", record.key());
    }
}