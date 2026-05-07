---
tags:
  - distributed
  - gotcha
  - ph01
phase:
date: 2026-05-06
---

# HealthController and flywhy+sql

## 📝 Notes

**Why `HealthController`?** Every production service needs a health endpoint. Load balancers, Kubernetes, monitoring tools all ping `/health` to know if your app is alive. It's the first thing ops teams check when something breaks.

**`@RestController`** — tells Spring this class handles HTTP requests and returns data directly (not HTML pages). Combines `@Controller` + `@ResponseBody`.

**`@GetMapping("/health")`** — maps HTTP GET requests to `/health` to this method.

**`Map.of()`** — Spring automatically serializes this to JSON `{"status":"UP","version":"1.0"}`. No extra work needed.

---

**Why Flyway + that SQL?** Flyway is a database migration tool. Instead of manually running SQL scripts, Flyway tracks which scripts have run and runs new ones automatically on startup.

The `V1__` prefix is the version number. Flyway runs scripts in order — V1, V2, V3. You'll add V2 tomorrow, V3 Wednesday etc as you build more tables.

The `JSONB` type on `payload` is PostgreSQL specific — it stores JSON but indexes it, so you can query inside the JSON later. Regular `TEXT` can't do that.

## ⚠️ Gotcha / Watch Out


## 🔗 Related
- 
