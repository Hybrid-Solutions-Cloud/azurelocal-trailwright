import microsoftSources from './contracts/microsoft/source-lock.json'
export const sources={
 sdn:'https://learn.microsoft.com/en-us/azure/azure-local/concepts/sdn-overview?view=azloc-2604',
 enableSdn:'https://learn.microsoft.com/en-us/azure/azure-local/deploy/enable-sdn-integration?view=azloc-2604',
 sanSdn:'https://learn.microsoft.com/en-us/azure/azure-local/plan/network-patterns-overview-disaggregated?view=azloc-2604',
 san:'https://learn.microsoft.com/en-us/azure/azure-local/concepts/san-requirements?view=azloc-2604',
 external:'https://learn.microsoft.com/en-us/azure/azure-local/deploy/enable-external-storage?view=azloc-2604',
 local:'https://learn.microsoft.com/en-us/azure/azure-local/deploy/deployment-local-identity-with-key-vault?view=azloc-2604',
 localOverview:'https://learn.microsoft.com/en-us/azure/azure-local/deploy/deployment-local-identity-with-key-vault-overview?view=azloc-2604',
 portal:'https://learn.microsoft.com/en-us/azure/azure-local/deploy/deploy-via-portal?view=azloc-2604',
 volumes:'https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/plan-volumes',
 knownIssues:'https://learn.microsoft.com/en-us/azure/azure-local/known-issues?view=azloc-2604',
 system:'https://learn.microsoft.com/en-us/azure/azure-local/concepts/system-requirements-23h2?view=azloc-2604',
 thin:'https://learn.microsoft.com/en-us/azure/azure-local/manage/manage-thin-provisioning-23h2?view=azloc-2604',
}
export const SUPPORT_CATALOG={version:'0.2.0',sourceLock:microsoftSources,release:{solution:'12.2604.1003.1006',os:'26100.32690'},reviewed:'2026-09-11',baseline:'2604.0.0',runtimeQualified:false,sources,entries:[
 {id:'arc-sdn',status:'documented-conditional',note:'Arc-managed NC is a cluster service. Check release, OS, intents and architecture.'},
 {id:'san-only-sdn',status:'unsupported',note:'The 2604 disaggregated matrix specifies external SDN, not Microsoft Arc NC/NSGs.'},
 {id:'san-protocol',status:'review',note:'SAN requirements describe FC-only preview; newer external attachment guidance includes iSCSI. Qualify SAN-only and hybrid separately.'},
 {id:'local-identity',status:'documentation-conflict',note:'The July overview applies to 2510 onward and documents support, while the 2604 landing index still labels the feature preview. Require release-specific feature-status confirmation; newer text does not silently qualify the baseline.'},
 {id:'san-filesystem',status:'documented-conditional',note:'The SAN requirements specify NTFS, one LUN per CSV, all-node presentation and consistent MPIO. That page still uses preview wording.'},
 {id:'hybrid-iscsi',status:'documented-conditional',note:'The attachment guide applies to an already-deployed 2604+ cluster and requires dedicated physical iSCSI ports outside Network ATC. This is not proof of SAN-only iSCSI certification.'},
 {id:'local-wac',status:'unsupported',note:'WAC is unsupported for administering a local-identity Azure Local cluster. Independently managed estates and customer workloads retain their own compatibility requirements.'},
 {id:'local-powershell-monitor-portal',status:'documented-conditional',note:'PowerShell, Azure Monitor and portal are documented management choices for local identity. MMC workflows and SCVMM require specific compatibility review.'},
 {id:'hardware-document-scope',status:'documentation-conflict',note:'The September system-requirements page mixes hyperconverged and disaggregated limits. Retain the explicit 2604 network matrix limits: 16 hyperconverged/hybrid nodes, 64 SAN-only nodes. Require OEM qualification.'},
 {id:'2604-deployment-build',status:'documented-conditional',note:'The 2604 known-issues section identifies solution 12.2604.1003.1006 and OS 26100.32690. Other servicing builds require their own release evidence.'},
 {id:'2604-known-issues',status:'review',note:'Review current MOC remediation, WAC volume-operation extension requirements and upgrade/recovery limitations. A selected version or supplied observation does not establish remediation.'},
]}
