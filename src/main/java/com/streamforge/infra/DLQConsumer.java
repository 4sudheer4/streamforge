package com.streamforge.infra;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class DLQConsumer {

    @KafkaListener(
        topics = "dlq",
        groupId = "streamforge-dlq-consumer"
    )
    public void consume(ConsumerRecord<String, String> record) {
        log.error("DLQ message received — processing failed after retries: " +
            "topic={} partition={} offset={} key={} value={}",
            record.topic(),
            record.partition(),
            record.offset(),
            record.key(),
            record.value());
    }
}