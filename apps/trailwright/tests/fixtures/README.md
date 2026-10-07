# Template fixtures

The two ARM templates here are copied from the Azure quickstart templates repository (https://github.com/Azure/azure-quickstart-templates, folder quickstarts/microsoft.azurestackhci, MIT license): `create-cluster` and `create-adless-cluster-external-dns-public-preview`. They are the contract the ARM parameter export is tested against: every template parameter must be present in the export, and no other.
