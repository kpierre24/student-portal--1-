# ✅ CI/CD & Kubernetes Setup Checklist

## 🚀 Immediate Actions (Required)

### GitHub Actions Setup
- [ ] Navigate to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
- [ ] Click **New repository secret** and add these 8 secrets:
  - [ ] `DOCKER_USERNAME` = `kpierre24`
  - [ ] `DOCKER_PASSWORD` = (generate at hub.docker.com → Account Settings → Security → Access Tokens)
  - [ ] `VITE_SUPABASE_URL` = `https://mjaloptcpeytvecbxbza.supabase.co`
  - [ ] `VITE_SUPABASE_ANON_KEY` = (from .env)
  - [ ] `VITE_FIREBASE_PROJECT_ID` = `gen-lang-client-0349093244`
  - [ ] `VITE_FIREBASE_API_KEY` = (from .env)
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN` = `gen-lang-client-0349093244.firebaseapp.com`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET` = `gen-lang-client-0349093244.firebasestorage.app`
- [ ] Commit workflow file: `git add .github/workflows/docker-build-push.yml && git commit -m "Add CI/CD"`
- [ ] Push to main: `git push origin main`
- [ ] ✅ GitHub Actions auto-builds and pushes image on every push!

### Verify CI/CD Works
- [ ] Go to GitHub repo → **Actions** tab
- [ ] See workflow "Build & Push Docker Image" running
- [ ] Wait for ✅ completion (~5 min)
- [ ] Verify image at Docker Hub: https://hub.docker.com/r/kpierre24/hteim-school-of-ministry/tags

---

## 🌐 Kubernetes Setup (Optional but Recommended)

### Prerequisites
- [ ] Have a Kubernetes cluster (GKE, EKS, AKS, or local Kind/Minikube)
- [ ] `kubectl` installed and configured
- [ ] `helm` installed
- [ ] Internet connection (for downloading Helm charts)

### One-Command Deploy (Recommended)
```bash
# Make script executable and run
bash scripts/k8s-deploy.sh
```

This automatically:
- ✅ Installs NGINX Ingress Controller
- ✅ Installs cert-manager
- ✅ Creates Let's Encrypt ClusterIssuer
- ✅ Deploys application with healthchecks
- ✅ Configures auto-scaling (2-5 replicas)

### OR Manual Steps
```bash
# Apply all manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n hteim-school-of-ministry
```

### After Deployment
- [ ] Edit `k8s/deployment.yaml` and update secrets (lines 23-29):
  - Replace placeholder values with actual API keys
  - Update `APP_URL` to your domain

- [ ] Edit `k8s/ingress.yaml` and update domain (lines 21, 29):
  - Replace `hteim.example.com` with your actual domain
  - Configure DNS A record to point to Ingress IP

- [ ] Reapply manifests:
  ```bash
  kubectl apply -f k8s/deployment.yaml
  kubectl apply -f k8s/ingress.yaml
  ```

### Test Locally (No Domain Needed)
```bash
# Port-forward to test
kubectl port-forward svc/hteim-service 3000:80 -n hteim-school-of-ministry

# In another terminal:
curl http://localhost:3000/api/health
# Should return: {"status":"ok","service":"hteim-school-of-ministry",...}
```

### Monitor Deployment
```bash
# Watch pods spin up
kubectl get pods -n hteim-school-of-ministry --watch

# View logs
kubectl logs -f deployment/hteim-school-of-ministry -n hteim-school-of-ministry

# Check ingress status (wait for EXTERNAL-IP)
kubectl get ingress -n hteim-school-of-ministry
```

---

## 📖 Documentation Files

Read these for detailed info:

1. **`CI_CD_SETUP.md`** — This document! Overview of what was created.
2. **`DEPLOYMENT.md`** — Complete deployment guide with troubleshooting.
3. **`.github/workflows/docker-build-push.yml`** — GitHub Actions workflow code.
4. **`k8s/deployment.yaml`** — Kubernetes Deployment, Service, HPA, ConfigMap, Secret.
5. **`k8s/ingress.yaml`** — Kubernetes Ingress (HTTPS routing).

---

## 🐳 Docker Compose (Local Development)

Still available for local testing:

```bash
# Build and run locally (with Supabase/Firebase secrets)
docker compose up --build

# Access at http://localhost:3000
```

---

## 🔄 Workflow: How It All Works Together

### Local Development
```
Code changes → git push origin main
     ↓
GitHub Actions Workflow Triggered
     ↓
Docker image built with secrets as build args
     ↓
Image pushed to Docker Hub (kpierre24/hteim-school-of-ministry:latest)
```

### Kubernetes Production
```
Updated Docker Hub image → Kubernetes detects new image
     ↓
(imagePullPolicy: Always) → Pulls latest
     ↓
Rolling update: new pods created, old terminated gracefully
     ↓
Readiness probe validates health before routing traffic
     ↓
Zero-downtime deployment! 🎉
```

---

## 🚨 Troubleshooting

### GitHub Actions Failing?
1. Check workflow logs: GitHub → Actions → Latest run → Logs
2. Verify all 8 secrets are set (Settings → Secrets → check count)
3. Common issues:
   - `DOCKER_PASSWORD` (access token) incorrect or expired
   - Secrets have typos in names (must match exactly)

### Kubernetes Pods Not Starting?
1. Check logs: `kubectl logs <pod-name> -n hteim-school-of-ministry`
2. Describe pod: `kubectl describe pod <pod-name> -n hteim-school-of-ministry`
3. Common issues:
   - `ImagePullBackOff` — Docker Hub image doesn't exist (run GitHub Actions first)
   - `CrashLoopBackOff` — App crashed (check logs for errors)
   - `Pending` — Cluster out of resources (reduce replicas in HPA)

### Health Check Failing?
1. Port-forward: `kubectl port-forward svc/hteim-service 3000:80 -n hteim-school-of-ministry`
2. Test manually: `curl http://localhost:3000/api/health`
3. Check server logs for errors

---

## 📊 What You Get

### CI/CD Benefits
✅ Automatic image builds on every commit
✅ Secrets never stored in code (GitHub Secrets)
✅ Image tagged with branch, version, commit SHA
✅ Docker Hub registry hosted & accessible globally
✅ ~5 minute build & push cycle

### Kubernetes Benefits
✅ **Auto-scaling**: 2-5 replicas based on CPU/memory
✅ **High availability**: Multi-replica deployment
✅ **Healthchecks**: Automatic failure detection & recovery
✅ **Zero-downtime updates**: Rolling updates
✅ **HTTPS**: Automatic cert generation (Let's Encrypt)
✅ **Load balancing**: Automatic traffic distribution
✅ **Resource limits**: Prevents runaway containers
✅ **Security**: Non-root user, secrets encrypted, RBAC-ready

---

## 🎯 Next Steps (Optional Enhancements)

- [ ] Add automated tests to CI/CD (before build)
- [ ] Set up Prometheus + Grafana for monitoring
- [ ] Configure backup strategy for Supabase
- [ ] Add alert rules (e.g., pod restart > 5 in 1 hour)
- [ ] Set up log aggregation (ELK, Datadog, etc.)
- [ ] Configure network policies for pod-to-pod security
- [ ] Add rate limiting at Ingress level
- [ ] Set up automated security scanning (Trivy, Snyk)

---

## 💡 Questions?

Refer to:
- **GitHub Actions docs**: https://docs.github.com/en/actions
- **Kubernetes docs**: https://kubernetes.io/docs/
- **cert-manager docs**: https://cert-manager.io/docs/
- **NGINX Ingress docs**: https://kubernetes.github.io/ingress-nginx/

---

**Status**: ✅ All files created. Ready to use!

**Last step**: Add GitHub Secrets and push. That's it! 🚀
