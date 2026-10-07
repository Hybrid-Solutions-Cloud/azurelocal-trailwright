// Azure regions where Azure Local is supported (Microsoft Learn, Azure Local system requirements, Azure requirements).
export const azureLocalRegions = [
  { value: 'eastus', label: 'East US', cloud: 'public' },
  { value: 'westeurope', label: 'West Europe', cloud: 'public' },
  { value: 'australiaeast', label: 'Australia East', cloud: 'public' },
  { value: 'southeastasia', label: 'Southeast Asia', cloud: 'public' },
  { value: 'centralindia', label: 'India Central', cloud: 'public' },
  { value: 'canadacentral', label: 'Canada Central', cloud: 'public' },
  { value: 'japaneast', label: 'Japan East', cloud: 'public' },
  { value: 'southcentralus', label: 'South Central US', cloud: 'public' },
  { value: 'usgovvirginia', label: 'US Gov Virginia', cloud: 'government' },
] as const;

export const regionValues = azureLocalRegions.map((r) => r.value) as [string, ...string[]];