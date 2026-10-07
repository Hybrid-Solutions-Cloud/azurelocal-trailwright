# Template fixtures

The ARM templates here are copied from the Azure quickstart templates repository (https://github.com/Azure/azure-quickstart-templates, folder quickstarts/microsoft.azurestackhci, MIT license). They are the contract the ARM parameter export is tested against: every template parameter must be present in the export, and no other.

| File | Template |
|---|---|
| create-cluster.azuredeploy.json | create-cluster (Active Directory) |
| create-adless-cluster.azuredeploy.json | create-adless-cluster-external-dns-public-preview (local identity) |
| san-azuredeploy.json (and the sample parameters) | create-cluster-san (disaggregated, Active Directory) |
| adless-san-azuredeploy.json | create-cluster-adless-san (disaggregated, local identity) |
| rac-azuredeploy.json | create-cluster-rac-enabled (rack-aware, Active Directory) |
| rac-adless-azuredeploy.json | create-rack-aware-adless-cluster-external-dns (rack-aware, local identity) |
| rac-disconnected-azuredeploy.json | create-cluster-rac-enabled-disconnected (rack-aware, disconnected operations) |
| usgov-azuredeploy.json | create-cluster-for-usgov (US Government cloud; its LCM password parameter is spelled AzureStackLCMAdminPasssword) |
