#!/usr/bin/env bash
# Tear down the AKS test cluster and resource group.
# Usage: ./scripts/aks-down.sh
set -euo pipefail

RESOURCE_GROUP="${AKS_RESOURCE_GROUP:-rg-kube-copilot-dev}"
CLUSTER_NAME="${AKS_CLUSTER_NAME:-aks-kube-copilot-dev}"

echo "=== Tearing down AKS test environment ==="
echo "  Resource Group : $RESOURCE_GROUP"
echo "  Cluster Name   : $CLUSTER_NAME"
echo ""

# Remove kubectl context
echo ">>> Removing kubectl context..."
kubectl config delete-context "$CLUSTER_NAME" 2>/dev/null || true
kubectl config delete-cluster "$CLUSTER_NAME" 2>/dev/null || true

# Delete the entire resource group (includes AKS + all child resources)
echo ">>> Deleting resource group (this takes 1-2 minutes)..."
az group delete \
  --name "$RESOURCE_GROUP" \
  --yes \
  --no-wait

echo ""
echo "=== Teardown initiated. Resource group deletion is running in background. ==="
echo "Check status: az group show --name $RESOURCE_GROUP --query properties.provisioningState -o tsv"
