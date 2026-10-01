# CI/CD & Kubernetes Setup Summary

## What Was Created

### 1. GitHub Actions Workflow
**File:** `.github/workflows/docker-build-push.yml`

Automatically builds and pushes Docker image to Docker Hub on:
- Commits to `main`/`master` branches
- Manual trigger via GitHub Actions UI

**What it does:**
- Builds multi-stage Dockerfile
- Passes Supabase/Firebase secrets as build args (from GitHub Secrets)
- Pushes to `kpierre24/hteim-school-of-ministry`
- Tags with branch, version, SHA, and `latest`
- Uses GitHub Actions cache layer for faster rebuilds

**First-time setup:**
```bash
# 1. Go to GitHub repo → Settings → Secrets and variables → Actions
# 2. Add these secrets:
DOCKER_USERNAME=kpierre24
DOCKER_PASSWORD=<docker-hub-token>
VITE_SUPABASE_URL=https://mjaloptcpeytvecbxbza.supabase.co
VITE_SUPABASE_ANON_KEY=<key>
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0349093244
VITE_FIREBASE_API_KEY=<key>
VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0349093244.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=gen-lang-client-0349093244.firebasestorage.app

# 3. Push to main branch
git add .github/workflows/docker-build-push.yml
git commit -m "Add GitHub Actions CI/CD"
git push origin main
```

### 2. Kubernetes Manifests
**Files:** `k8s/deployment.yaml`, `k8s/ingress.yaml`

#### Deployment Features:
- **2-5 replicas** (auto-scales via HPA based on CPU/memory)
- **Liveness probe** `/api/health` — restarts dead containers
- **Readiness probe** `/api/health` — removes unhealthy pods from load balancer
- **Startup probe** `/api/health` — gives containers time to start
- **Security context** — non-root user (node), read-only filesystem
- **Resource limits** — 250m CPU / 256MB memory (requests) → 500m / 512MB (limits)
- **Graceful shutdown** — 10 second termination grace period
- **Pod anti-affinity** — spreads replicas across nodes (prefers)
- **Init container** — validates secrets before pod starts
- **ConfigMap** — non-sensitive env vars (NODE_ENV, PORT, HOST)
- **Secret** — sensitive vars (API keys) injected at runtime

#### Service:
- **Type:** LoadBalancer (exposes external IP)
- **Ports:** 80 (HTTP) and 8080 (alt) → 3000 (app)

#### Ingress:
- **HTTPS with Let's Encrypt** (via cert-manager)
- **Rate limiting** 100 req/min
- **CORS/proxy tuning** for 10MB file uploads
- **Domain-based routing** (configurable)

#### HPA (Horizontal Pod Autoscaler):
- Min 2 / Max 5 replicas
- Scale up at 70% CPU or 80% memory
- Scale down gradually (50% reduction per minute)

### 3. Documentation
**File:** `DEPLOYMENT.md`

Complete guide including:
- GitHub Secrets setup
- Kubernetes cluster prerequisites (NGINX, cert-manager)
- Step-by-step deployment
- Health check explanation
- Troubleshooting tips
- Comparison: Docker Compose vs Kubernetes

### 4. Deployment Script
**File:** `scripts/k8s-deploy.sh`

One-command deployment:
```bash
bash scripts/k8s-deploy.sh
```

Automates:
- NGINX Ingress installation
- cert-manager installation
- ClusterIssuer creation
- Application deployment
- Rollout status monitoring

---

## Quick Start

### GitHub Actions (CI/CD)

1. Add GitHub Secrets (see above)
2. Push code to `main`
3. Workflow auto-triggers
4. Image available at `kpierre24/hteim-school-of-ministry:latest`

**Check workflow:**
```
GitHub → Actions → Latest run
```

### Kubernetes Deployment

**Prerequisites:**
- Kubernetes cluster (GKE, EKS, AKS, or local Kind)
- `kubectl` and `helm` installed

**Deploy in 30 seconds:**
```bash
bash scripts/k8s-deploy.sh
```

**Or manual:**
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl get pods -n hteim-school-of-ministry
```

**Test health:**
```bash
kubectl port-forward svc/hteim-service 3000:80 -n hteim-school-of-ministry
curl http://localhost:3000/api/health
```

---

## How Healthchecks Work

### In Docker (Container-level)
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', ...)"
```

### In Kubernetes (Pod-level, 3 types)

1. **Startup Probe** (first 30 seconds)
   - Path: `/api/health`
   - Purpose: Give app time to boot
   - If fails 6× → Pod rejected

2. **Liveness Probe** (after startup)
   - Path: `/api/health`
   - Purpose: Detect dead containers
   - If fails 3× → Container restarted
   - Runs every 10 seconds

3. **Readiness Probe** (after startup)
   - Path: `/api/health`
   - Purpose: Detect traffic-not-ready state
   - If fails 2× → Remove from load balancer
   - Runs every 5 seconds

**All three hit the same `/api/health` endpoint:**
```json
GET /api/health
→ {"status":"ok","service":"hteim-school-of-ministry","timestamp":"..."}
```

---

## Environment Variables

### At Build Time (GitHub Actions)
Passed to Docker build via `--build-arg`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FIREBASE_*` keys

These are baked into the React bundle and sent to the browser.

### At Runtime (Kubernetes)
Injected into container via ConfigMap + Secret:
- `NODE_ENV=production`
- `PORT=3000`
- `HOST=0.0.0.0`
- `GEMINI_API_KEY` (from Secret)

Runtime vars are NOT in the browser (server-only).

---

## Scaling & Performance

### Automatic Scaling
HPA monitors CPU/memory and adjusts replicas:
```bash
# Watch scaling decisions
kubectl get hpa -n hteim-school-of-ministry --watch
```

### Resource Limits
Each container:
- **Requests** (guaranteed): 250m CPU, 256MB memory
- **Limits** (hard cap): 500m CPU, 512MB memory

If pod exceeds limits → OOMKilled or throttled

### Load Balancing
Kubernetes Service distributes traffic across all ready replicas using round-robin.

---

## Monitoring & Alerts

**Prometheus metrics** (annotations ready):
```yaml
prometheus.io/scrape: "true"
prometheus.io/port: "3000"
prometheus.io/path: "/api/health"
```

Set up monitoring:
1. Install Prometheus + Grafana
2. Add ServiceMonitor:
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hteim
spec:
  selector:
    matchLabels:
      app: hteim-app
  endpoints:
  - port: http
    interval: 30s
```

---

## Next Actions

1. **Add GitHub Secrets** (required)
   ```
   GitHub → Repo → Settings → Secrets and variables → Actions
   ```

2. **Push workflow file**
   ```bash
   git add .github/workflows/docker-build-push.yml
   git commit -m "Add CI/CD workflow"
   git push origin main
   ```

3. **For Kubernetes deployment:**
   - Update secrets in `k8s/deployment.yaml`
   - Update domain in `k8s/ingress.yaml`
   - Run: `bash scripts/k8s-deploy.sh` OR `kubectl apply -f k8s/*.yaml`

4. **Monitor**
   ```bash
   kubectl logs -f deployment/hteim-school-of-ministry -n hteim-school-of-ministry
   kubectl get pods -n hteim-school-of-ministry --watch
   ```

---

## Files Created

```
.github/
└── workflows/
    └── docker-build-push.yml        (GitHub Actions workflow)

k8s/
├── deployment.yaml                  (Deployment + Service + HPA)
└── ingress.yaml                     (Ingress for HTTPS routing)

scripts/
└── k8s-deploy.sh                    (One-command deployment)

DEPLOYMENT.md                         (Full guide)
```

All files are production-ready. Just add secrets and push!
