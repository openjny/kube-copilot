# Tear down the AKS test cluster and resource group.
#
# Usage:
#   .\scripts\aks-down.ps1
#   .\scripts\aks-down.ps1 -ResourceGroup my-rg
#
param(
    [string]$ResourceGroup = $env:AKS_RESOURCE_GROUP ?? "rg-kube-copilot-dev",
    [string]$ClusterName = $env:AKS_CLUSTER_NAME ?? "aks-kube-copilot-dev"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Tearing down AKS test environment ===" -ForegroundColor Cyan
Write-Host "  Resource Group : $ResourceGroup"
Write-Host "  Cluster Name   : $ClusterName"
Write-Host ""

# Remove kubectl context
Write-Host ">>> Removing kubectl context..." -ForegroundColor Yellow
kubectl config delete-context $ClusterName 2>$null
kubectl config delete-cluster $ClusterName 2>$null

# Delete the entire resource group
Write-Host ">>> Deleting resource group (running in background)..." -ForegroundColor Yellow
az group delete --name $ResourceGroup --yes --no-wait

Write-Host ""
Write-Host "=== Teardown initiated. Resource group deletion is running in background. ===" -ForegroundColor Green
Write-Host "Check status: az group show --name $ResourceGroup --query properties.provisioningState -o tsv"
