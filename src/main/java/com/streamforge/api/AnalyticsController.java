package com.streamforge.api;

import com.streamforge.engine.TopKEventTracker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final TopKEventTracker topKEventTracker;

    @GetMapping("/top-events")
    public ResponseEntity<?> getTopEvents(
            @RequestParam(defaultValue = "10") int k) {

        if (k < 1 || k > 100) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "k must be between 1 and 100"));
        }

        List<TopKEventTracker.TopKEntry> results = topKEventTracker.getTopK(k);

        return ResponseEntity.ok(Map.of(
            "k", k,
            "totalTypes", results.size(),
            "results", results
        ));
    }
}