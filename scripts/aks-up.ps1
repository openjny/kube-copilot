# Create a minimal AKS test cluster for kube-copilot development.
#
# Usage:
#   .\scripts\aks-up.ps1
#   .\scripts\aks-up.ps1 -Location westus2 -NodeVmSize Standard_B2s
#
param(
    [string]$ResourceGroup = $env:AKS_RESOURCE_GROUP ?? "rg-kube-copilot-dev",
    [string]$ClusterName = $env:AKS_CLUSTER_NAME ?? "aks-kube-copilot-dev",
    [string]$Location = $env:AKS_LOCATION ?? "southeastasia",
    [int]$NodeCount = ($env:AKS_NODE_COUNT ?? 1),
    [string]$NodeVmSize = $env:AKS_NODE_VM_SIZE ?? "Standard_D2s_v5"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Creating AKS test environment ===" -ForegroundColor Cyan
Write-Host "  Resource Group : $ResourceGroup"
Write-Host "  Cluster Name   : $ClusterName"
Write-Host "  Location       : $Location"
Write-Host "  Node Count     : $NodeCount"
Write-Host "  VM Size        : $NodeVmSize"
Write-Host ""

# Create resource group
Write-Host ">>> Creating resource group..." -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location --output none
if ($LASTEXITCODE -ne 0) { throw "Failed to create resource group" }

# Create AKS cluster
Write-Host ">>> Creating AKS cluster (this takes 3-5 minutes)..." -ForegroundColor Yellow
az aks create `
    --resource-group $ResourceGroup `
    --name $ClusterName `
    --location $Location `
    --node-count $NodeCount `
    --node-vm-size $NodeVmSize `
    --generate-ssh-keys `
    --output none

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to create AKS cluster." -ForegroundColor Red
    Write-Host "Your subscription may not allow VM size '$NodeVmSize' in '$Location'."
    Write-Host "Try a different region or VM size:"
    Write-Host "  .\scripts\aks-up.ps1 -Location westus2 -NodeVmSize Standard_B2s"
    Write-Host ""
    Write-Host "To list available VM sizes in a region:"
    Write-Host '  az vm list-skus -l <region> --resource-type virtualMachines --query "[?restrictions==null].name" -o tsv'
    exit 1
}

# Get credentials
Write-Host ">>> Fetching kubectl credentials..." -ForegroundColor Yellow
az aks get-credentials --resource-group $ResourceGroup --name $ClusterName --overwrite-existing
if ($LASTEXITCODE -ne 0) { throw "Failed to get credentials" }

# Deploy sample workloads
Write-Host ">>> Deploying sample workloads..." -ForegroundColor Yellow

kubectl create namespace demo --dry-run=client -o yaml | kubectl apply -f -

@"
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
"@ | kubectl apply -n demo -f -

Write-Host ""
Write-Host "=== AKS test environment is ready! ===" -ForegroundColor Green
Write-Host ""
kubectl get nodes
Write-Host ""
kubectl get pods -n demo
Write-Host ""
Write-Host "Run 'pnpm dev' to start kube-copilot."
