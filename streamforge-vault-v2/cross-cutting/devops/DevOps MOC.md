# DevOps MOC

> Docker, Kubernetes, GCP, CI/CD notes.

---

## Docker
- [[Multi-Stage Dockerfile]]
- [[Docker Compose Networking]]
- [[Container Healthchecks]]

## Kubernetes
- 

## GCP
- [[GCP Cloud Run Setup]]

## CI/CD
- [[GitHub Actions Pipeline]]

## Load Testing
- [[Gatling Load Test]]

---

## Commands Quick Reference

### Docker
```bash
# Build image
docker build -t streamforge:latest .

# Run with env
docker run -p 8080:8080 --env-file .env streamforge:latest

# Shell into debug container
docker run -it --entrypoint /busybox/sh gcr.io/distroless/java21:debug

# Check logs
docker compose logs -f app
```

### Docker Compose
```bash
docker compose up -d          # start all
docker compose down -v        # stop + remove volumes
docker compose ps             # status
docker compose logs kafka -f  # tail kafka logs
```

### GCP Cloud Run
```bash
# Deploy
gcloud run deploy streamforge \
  --image {region}-docker.pkg.dev/{project}/streamforge/app:latest \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 3 \
  --memory 2Gi

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

---

## Add Your Own Notes
- 
