#!/bin/bash
set -e

echo "🚀 HTEIM School of Ministry - Kubernetes Quick Deploy"
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl not found. Install it first."; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "❌ helm not found. Install it first."; exit 1; }

# Check cluster connection
kubectl cluster-info >/dev/null 2>&1 || { echo "❌ kubectl not connected to cluster."; exit 1; }
echo "✓ kubectl connected to $(kubectl config current-context)"
echo ""

# Step 1: Install NGINX Ingress
echo "📦 Installing NGINX Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1
helm repo update >/dev/null 2>&1
helm upgrade --install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --wait >/dev/null 2>&1
echo "✓ NGINX Ingress installed"
echo ""

# Step 2: Install cert-manager
echo "📦 Installing cert-manager for HTTPS..."
helm repo add jetstack https://charts.jetstack.io >/dev/null 2>&1
helm repo update >/dev/null 2>&1
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  --wait >/dev/null 2>&1
echo "✓ cert-manager installed"
echo ""

# Step 3: Create ClusterIssuer
echo "🔐 Creating Let's Encrypt ClusterIssuer..."
kubectl apply -f - <<EOF >/dev/null 2>&1
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
echo "✓ ClusterIssuer created"
echo ""

# Step 4: Deploy application
echo "🐳 Deploying HTEIM application..."
kubectl apply -f k8s/deployment.yaml >/dev/null 2>&1
echo "✓ Deployment manifest applied"
echo ""

kubectl apply -f k8s/ingress.yaml >/dev/null 2>&1
echo "✓ Ingress manifest applied"
echo ""

# Step 5: Wait for rollout
echo "⏳ Waiting for pods to be ready..."
kubectl rollout status deployment/hteim-school-of-ministry -n hteim-school-of-ministry --timeout=5m

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Status:"
kubectl get pods -n hteim-school-of-ministry
echo ""
echo "🔗 Service:"
kubectl get svc -n hteim-school-of-ministry
echo ""
echo "🌐 Ingress (wait for EXTERNAL-IP):"
kubectl get ingress -n hteim-school-of-ministry
echo ""
echo "📝 To update secrets, edit: k8s/deployment.yaml"
echo "🔍 To view logs: kubectl logs -f deployment/hteim-school-of-ministry -n hteim-school-of-ministry"
echo "🌍 To test locally: kubectl port-forward svc/hteim-service 3000:80 -n hteim-school-of-ministry"
