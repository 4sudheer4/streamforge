#!/bin/bash

echo "Building baseline..."
for j in $(seq 1 10); do
  for i in $(seq 1 5); do
    curl -s -X POST http://localhost:8080/api/v1/events \
      -H "Content-Type: application/json" \
      -H "X-Source-Id: payment-service" \
      -d "{\"sourceId\":\"payment-service\",\"type\":\"payment\",\"payload\":{\"amount\":$RANDOM}}" &
  done
  wait
  sleep 1
  echo "Baseline second $j complete"
done

echo "Waiting for baseline to stabilize..."
sleep 2

echo "Firing spike..."
for i in $(seq 1 50); do
  curl -s -X POST http://localhost:8080/api/v1/events \
    -H "Content-Type: application/json" \
    -H "X-Source-Id: payment-service" \
    -d "{\"sourceId\":\"payment-service\",\"type\":\"payment\",\"payload\":{\"amount\":$RANDOM}}" &
done
wait
echo "Spike fired"
