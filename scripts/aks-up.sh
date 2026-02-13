#!/usr/bin/env bash
# Create a minimal AKS test cluster for kube-copilot development.
#
# Usage:
#   ./scripts/aks-up.sh
#   AKS_LOCATION=westus2 AKS_NODE_VM_SIZE=Standard_B2s ./scripts/aks-up.sh
#
# Environment variables (all optional):
#   AKS_RESOURCE_GROUP  - Resource group name  (default: rg-kube-copilot-dev)
#   AKS_CLUSTER_NAME    - AKS cluster name     (default: aks-kube-copilot-dev)
#   AKS_LOCATION        - Azure region          (default: southeastasia)
#   AKS_NODE_COUNT      - Number of nodes       (default: 1)
#   AKS_NODE_VM_SIZE    - VM size               (default: Standard_D2s_v5)
#
set -euo pipefail

RESOURCE_GROUP="${AKS_RESOURCE_GROUP:-rg-kube-copilot-dev}"
CLUSTER_NAME="${AKS_CLUSTER_NAME:-aks-kube-copilot-dev}"
LOCATION="${AKS_LOCATION:-southeastasia}"
NODE_COUNT="${AKS_NODE_COUNT:-1}"
NODE_VM_SIZE="${AKS_NODE_VM_SIZE:-Standard_D2s_v5}"

echo "=== Creating AKS test environment ==="
echo "  Resource Group : $RESOURCE_GROUP"
echo "  Cluster Name   : $CLUSTER_NAME"
echo "  Location       : $LOCATION"
echo "  Node Count     : $NODE_COUNT"
echo "  VM Size        : $NODE_VM_SIZE"
echo ""

# Create resource group
echo ">>> Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# Create AKS cluster (minimal config for dev/test)
echo ">>> Creating AKS cluster (this takes 3-5 minutes)..."
if ! az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --location "$LOCATION" \
  --node-count "$NODE_COUNT" \
  --node-vm-size "$NODE_VM_SIZE" \
  --generate-ssh-keys \
  --output none; then
  echo ""
  echo "ERROR: Failed to create AKS cluster."
  echo "Your subscription may not allow VM size '$NODE_VM_SIZE' in '$LOCATION'."
  echo "Try a different region or VM size:"
  echo "  AKS_LOCATION=westus2 AKS_NODE_VM_SIZE=Standard_B2s ./scripts/aks-up.sh"
  echo ""
  echo "To list available VM sizes in a region:"
  echo "  az vm list-skus -l <region> --resource-type virtualMachines --query \"[?restrictions==null].name\" -o tsv"
  exit 1
fi

# Get credentials (merge into ~/.kube/config)
echo ">>> Fetching kubectl credentials..."
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --overwrite-existing

# Deploy sample workloads for testing
echo ">>> Deploying sample workloads..."
kubectl create namespace demo --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n demo -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-demo
  labels:
    app: nginx-demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-demo
  template:
    metadata:
      labels:
        app: nginx-demo
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-demo
spec:
  selector:
    app: nginx-demo
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
EOF

echo ""
echo "=== AKS test environment is ready! ==="
echo ""
kubectl get nodes
echo ""
kubectl get pods -n demo
echo ""
echo "Run 'pnpm dev' to start kube-copilot."
