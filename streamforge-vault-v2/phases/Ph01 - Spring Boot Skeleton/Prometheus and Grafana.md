---
tags:
  - ph01
  - distributed
  - devops
phase:
date: 2026-05-06
---

# Concept: Prometheus and Grafana

## 💡 What It Is

Prometheus and Grafana are the "power couple" of modern infrastructure monitoring. While they are often used together, they serve two distinct purposes: **Prometheus is the database and data collector**, while **Grafana is the visual interface.**

---

# 1. Prometheus: The Data Collector

Prometheus acts as the "back-end." It is responsible for gathering data and storing it so it can be queried later.

- **Metric Collection:** It uses a **pull model**, meaning it reaches out to your services at regular intervals to "scrape" their current status.
    
- **Time-Series Database:** It stores data as a series of numbers over time. It doesn't store logs (text sentences); it stores metrics (numbers like CPU usage, memory, or request counts).
    
- **Alerting:** It can monitor your data in real-time and trigger alerts if a value crosses a certain threshold (e.g., "Send an alert if the server is down for more than 2 minutes").
    

---

## Concept: How Prometheus actually work

### 💡 What It Is
```
global:

scrape_interval: 15s

  

scrape_configs:

- job_name: 'streamforge'

static_configs:

- targets: ['host.docker.internal:8080']

metrics_path: '/actuator/prometheus'
```

### 🔍 How It Works

The reason we use a specific Docker-related endpoint is all about how containers "talk" to each other and how Prometheus "sees" your application's internals.

### 1. Why target `host.docker.internal`?

When you run Prometheus inside a Docker container, it lives in its own isolated "bubble." It cannot see `localhost` because, to the container, `localhost` means _itself_, not your computer.

- **The Bridge:** `host.docker.internal` is a special DNS name that acts as a bridge. It tells the Prometheus container: "Exit your bubble and look at the actual machine I'm running on."
    
- **The Port (8080):** Your application is listening on port 8080 of your host machine. By targeting this address, Prometheus can reach out of the Docker network and grab the data from your app.
    

---

### 2. How does it track _all_ the endpoints in the app?

This is a common point of confusion. Prometheus **does not** actually visit every single URL in your app (like `/login`, `/home`, or `/api/data`). It only visits **one** endpoint: `/actuator/prometheus`.

Think of the `/actuator/prometheus` endpoint as a **Summary Report**.

#### The Internal "Accounting" Process:

1. **The Interceptor:** As we discussed, there is a "gatekeeper" (Middleware) inside your app. It sits at the front door.
    
2. **Tracking:** Every time a user hits _any_ endpoint, the gatekeeper makes a note: _"Someone just hit /api/movies and it took 50ms."_
    
3. **The Registry:** It saves this info in an internal list (the Registry) in your app's memory.
    
4. **The Export:** When Prometheus calls `/actuator/prometheus`, the app doesn't say "Go check my other pages." Instead, it says, "Here is the summarized list of everything that has happened on all my pages since I started."
    

---

### 3. What the "Summary Report" looks like

When Prometheus scrapes that one single endpoint, it sees lines like this:

- `http_server_requests_seconds_count{uri="/login"} 500`
    
- `http_server_requests_seconds_count{uri="/api/movies"} 1200`
    
- `http_server_requests_seconds_count{uri="/profile"} 30`
    

Prometheus now "knows" about all your endpoints because your application **told it** about them in that single text file.

### Summary

- **Targeting Docker:** We use `host.docker.internal` so Prometheus can "escape" its container to find your app.
    
- **Tracking Endpoints:** Prometheus only scrapes **one** page. That page contains a pre-calculated list of everything happening across your **entire** application.
- 
-----------------------------------------------------------------------
# 2. Grafana: The Visualizer

Grafana is the "front-end." It doesn't usually store its own data; instead, it connects to Prometheus (and other sources) to turn raw numbers into beautiful, interactive dashboards.

- **Dashboards:** It provides a wide variety of charts, graphs, heatmaps, and tables.
    
- **Multi-Source:** While it works perfectly with Prometheus, it can simultaneously pull data from other places like AWS CloudWatch, SQL databases, or Elasticsearch, and show them all on one screen.
    
- **Exploration:** It allows you to "drill down" into data visually, changing time ranges or filtering by specific servers with a few clicks.
    

---

## How They Work Together

Think of the relationship like a **CCTV security system**:

|**Component**|**Analogy**|**Technical Role**|
|---|---|---|
|**Prometheus**|The Recorder|It records the footage (data) and stores it on a hard drive.|
|**Grafana**|The Monitor|The screen in the security room where you actually watch the footage.|

### The Typical Workflow:

1. **Prometheus** scrapes metrics from your application (e.g., "Current Temperature: 75°C").
    
2. **Prometheus** stores that number with a timestamp in its database.
    
3. **Grafana** sends a query to Prometheus asking, "What was the temperature for the last 24 hours?"
    
4. **Grafana** draws a line graph on your dashboard showing the temperature trends.
    

---

## Why use both?

While Prometheus has a very basic built-in browser to view data, it is not designed for high-level monitoring or sharing with a team. Grafana is much more powerful for:

- **High-level overviews:** Creating a "Wall of Monitors" for an office.
    
- **User Management:** Giving different people access to specific dashboards.
    
- **Complexity:** Combining data from five different tools into one unified view.
