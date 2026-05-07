---
tags:
  - code
  - java
  - distributed
  - ph01
phase:
date: 2026-05-06
---

# why prometheus.yml


```
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'streamforge'
    static_configs:
      - targets: ['host.docker.internal:8080']
    metrics_path: '/actuator/prometheus'
```


## 📝 Notes

**`scrape_interval: 15s`** — Prometheus is a _pull-based_ system. Unlike logging where your app pushes data out, Prometheus comes to your app every 15 seconds and asks "give me your metrics."

**`targets: ['host.docker.internal:8080']`** — this is how the Prometheus container reaches your Spring Boot app running on your laptop. `host.docker.internal` is Docker's special DNS name that resolves to your machine from inside a container.

**`metrics_path: '/actuator/prometheus'`** — this is the endpoint Spring Boot exposes via Micrometer. When Prometheus scrapes it, it gets all your counters, gauges, histograms in a text format.

The flow is:

```
Spring Boot (Micrometer) → /actuator/prometheus
        ↑ scrape every 15s
    Prometheus
        ↓ query
    Grafana dashboard
```
## ⚠️ Gotcha / Watch Out


## 🔗 Related
- 
