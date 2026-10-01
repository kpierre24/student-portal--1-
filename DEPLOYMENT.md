# HTEIM School of Ministry - CI/CD & Kubernetes Deployment Guide

## GitHub Actions CI/CD Setup

### Prerequisites
1. Docker Hub account (already have: `kpierre24`)
2. GitHub repository with this project
3. GitHub Secrets configured

### Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
DOCKER_USERNAME=kpierre24
DOCKER_PASSWORD=<your-docker-hub-access-token>
VITE_SUPABASE_URL=https://mjaloptcpeytvecbxbza.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0349093244
VITE_FIREBASE_API_KEY=<your-firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0349093244.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=gen-lang-client-0349093244.firebasestorage.app
```

### Workflow Trigger

The workflow (`.github/workflows/docker-build-push.yml`) automatically:
- Runs on pushes to `main` or `master` branches
- Triggers on changes to source, Dockerfile, or config files
- Can be manually triggered via "Run workflow" in GitHub Actions tab
- Tags images with branch name, version, SHA, and `latest`

### Outputs

After workflow completes:
- Image pushed to Docker Hub: `kpierre24/hteim-school-of-ministry:latest`
- Can be pulled and run immediately: `docker run -p 3000:3000 kpierre24/hteim-school-of-ministry:latest`

---

## Kubernetes Deployment

### Prerequisites
1. Kubernetes cluster (GKE, EKS, AKS, or local Kind/Minikube)
2. `kubectl` configured to access your cluster
3. NGINX Ingress Controller installed (for Ingress routing)
4. cert-manager installed (for HTTPS/TLS)

### Install Prerequisites

#### NGINX Ingress Controller
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
```

#### cert-manager (for Let's Encrypt HTTPS)
```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

Create a ClusterIssuer for Let's Encrypt:
```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: kpierre24@gmail.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Deploy to Kubernetes

#### Step 1: Update Configuration
Edit `k8s/deployment.yaml`:
- Replace `YOUR_GEMINI_API_KEY`, `YOUR_SUPABASE_ANON_KEY`, `YOUR_FIREBASE_API_KEY` with actual values
- Update `APP_URL` in ConfigMap (e.g., `https://hteim.example.com`)

Edit `k8s/ingress.yaml`:
- Replace `hteim.example.com` with your actual domain (2 places)

#### Step 2: Apply Manifests
```bash
# Create namespace and deploy all resources
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n hteim-school-of-ministry
kubectl get svc -n hteim-school-of-ministry
kubectl get ingress -n hteim-school-of-ministry

# Watch rollout
kubectl rollout status deployment/hteim-school-of-ministry -n hteim-school-of-ministry
```

#### Step 3: Monitor Health Checks
```bash
# View probe status
kubectl describe pod <pod-name> -n hteim-school-of-ministry

# View logs
kubectl logs -f deployment/hteim-school-of-ministry -n hteim-school-of-ministry

# Health check endpoint (port-forward to test locally)
kubectl port-forward svc/hteim-service 3000:80 -n hteim-school-of-ministry
curl http://localhost:3000/api/health
```

### Healthchecks Explained

The deployment includes 3 probe types:

1. **Liveness Probe** (`/api/health`)
   - Checks if container is alive
   - Restarts container if unhealthy
   - Runs every 10 seconds after 30-second delay
   - Fails after 3 consecutive failures

2. **Readiness Probe** (`/api/health`)
   - Checks if container is ready to receive traffic
   - Removes pod from load balancer if unhealthy
   - Runs every 5 seconds after 10-second delay
   - Fails after 2 consecutive failures

3. **Startup Probe** (`/api/health`)
   - Gives slow startups time to boot
   - Runs every 5 seconds for up to 30 seconds (6 failures × 5s)
   - Disables liveness/readiness checks until it passes

### Auto-Scaling

The HorizontalPodAutoscaler (HPA) automatically:
- Scales from 2 to 5 replicas
- Scales up when CPU > 70% or Memory > 80%
- Scales down gradually to prevent flapping

Monitor HPA:
```bash
kubectl get hpa -n hteim-school-of-ministry --watch
```

### Accessing the Application

Once Ingress is ready (TLS certificate provisioned):
```bash
# Get Ingress IP/hostname
kubectl get ingress -n hteim-school-of-ministry

# Visit: https://hteim.example.com (once DNS is configured)
```

For local testing with port-forward:
```bash
kubectl port-forward svc/hteim-service 3000:80 -n hteim-school-of-ministry
# Visit: http://localhost:3000
```

### Troubleshooting

**Pod stuck in CrashLoopBackOff:**
```bash
kubectl logs <pod-name> -n hteim-school-of-ministry
kubectl describe pod <pod-name> -n hteim-school-of-ministry
```

**ImagePullBackOff:**
```bash
# Verify image exists in Docker Hub
docker pull kpierre24/hteim-school-of-ministry:latest

# Check if Kubernetes can pull it
kubectl describe pod <pod-name> -n hteim-school-of-ministry | grep -i pull
```

**Readiness probe failing:**
```bash
# Port-forward and test manually
kubectl port-forward pod/<pod-name> 3000:3000 -n hteim-school-of-ministry
curl http://localhost:3000/api/health
```

**Secrets not injected:**
```bash
# Verify secrets exist
kubectl get secrets -n hteim-school-of-ministry
kubectl describe secret hteim-secrets -n hteim-school-of-ministry
```

### Rolling Updates

Update image on new Docker Hub push:
```bash
# Kubernetes auto-pulls latest due to imagePullPolicy: Always
# Force rollout restart if needed:
kubectl rollout restart deployment/hteim-school-of-ministry -n hteim-school-of-ministry
```

### Cleanup

Remove all resources:
```bash
kubectl delete namespace hteim-school-of-ministry
```

---

## Local Docker Compose vs Kubernetes

| Feature | Docker Compose | Kubernetes |
|---------|----------------|-----------|
| **Replicas** | Single container | 2-5 replicas (HPA) |
| **Healthchecks** | Basic (Docker) | Advanced (liveness, readiness, startup) |
| **Auto-scaling** | Manual | Automatic (HPA) |
| **Routing** | Port mapping | Ingress + Ingress Controller |
| **HTTPS** | Manual setup | Auto (cert-manager + Let's Encrypt) |
| **Updates** | Manual rebuild | Rolling updates (0 downtime) |
| **Load balancing** | Docker Compose networking | Kubernetes Service |
| **Secrets** | .env file | Kubernetes Secrets (encrypted) |
| **Resource limits** | Optional | Required |
| **Monitoring** | Basic | Prometheus-ready annotations |

---

## Next Steps

1. **Monitor in production:**
   - Set up Prometheus scraping (annotations already in place)
   - Use Datadog, New Relic, or Grafana for dashboards

2. **Add authentication:**
   - Configure OAuth2 Proxy for GitHub/Google login
   - Use cert-manager for mTLS between services

3. **CI/CD enhancements:**
   - Add automated tests before build
   - Add SonarQube or CodeClimate for code quality
   - Add automated rollback on failed health checks

4. **Database backups:**
   - Set up Supabase backup schedules
   - Test restore procedures monthly
