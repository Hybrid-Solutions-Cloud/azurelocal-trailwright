import {describe,it,expect} from 'vitest'
import {load} from 'js-yaml'
import {readFileSync} from 'node:fs'
import {armFixture} from './testing/armFixture'
import {activeBranch,collections,fieldApplicable,settings} from './catalog'
import {canonical,newProject,newRecord,parseProject,SCHEMA,type Project} from './project'
import {activeRecords} from './selectors'
import {assess} from './assessment'
import {componentDecisions,infrastructureYaml,masterInfrastructure} from './masterInfrastructure'
import {exportFiles} from './exports'

const reopen=(p:Project)=>parseProject(canonical(p))
const field=(group:string,key:string,record=false)=>(record?collections:settings).find(g=>g.key===group)!.fields.find(f=>f.key===key)!
const applicable=(p:Project,group:string,key:string)=>activeBranch(settings.find(g=>g.key===group)!.branch,p.config)&&fieldApplicable(field(group,key),p.config[group],p.config)
const collectionActive=(p:Project,key:string)=>activeBranch(collections.find(g=>g.key===key)!.branch,p.config)
const add=(p:Project,group:string,values:Record<string,unknown>)=>{const r=newRecord(group);Object.assign(r.values,values);p.records[group].push(r);return r}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const infra=(p:Project)=>masterInfrastructure(p) as any

/** Synthetic design with every component in use and a unique marker value per component. */
function fullDesign():Project{
 const p=armFixture('ad'),node=p.records.nodes[0],adapter=p.records.adapters[0]
 p.records.nodes.forEach((n,i)=>{n.values.bmc=`203.0.113.${11+i}`})
 Object.assign(p.config.management,{azurePlane:'used',managementServices:'mark-azure-plane'})
 Object.assign(p.config.firewall,{provider:'tierpoint-fortinet',haGroupName:'mark-fw-ha',credentialRef:'keyvault://kv-synthetic/fortigate-admin'})
 const fw1=add(p,'firewalls',{name:'mark-fw01',role:'primary',managementIp:'192.0.2.8',wanIp:'198.51.100.10',haPriority:200})
 add(p,'firewalls',{name:'mark-fw02',role:'secondary',managementIp:'192.0.2.9'})
 Object.assign(p.config.tor,{provider:'tierpoint-dell',model:'S5248F-ON',peerLinkPorts:'mark-tor-peer'})
 const sw1=add(p,'torSwitches',{name:'mark-tor01',role:'primary',managementIp:'192.0.2.6',credentialRef:'secret-ref://synthetic/switch-admin'})
 add(p,'torSwitches',{name:'mark-tor02',role:'secondary',managementIp:'192.0.2.7'})
 add(p,'nicLinks',{name:'mark-nic-link',adapter:adapter.id,torSwitch:sw1.id,torPort:'ethernet1/1/3'})
 add(p,'firewallLinks',{name:'mark-fw-link',firewall:fw1.id,firewallPort:'wan2',torSwitch:sw1.id,torPort:'ethernet1/1/1'})
 Object.assign(p.config.oob,{model:'opengear',vlan:210,cidr:'192.0.2.192/26',ogHostname:'mark-og01',ogManagementIp:'192.0.2.200',lighthouseAddress:'lighthouse.example.test',enrollmentTokenRef:'secret-ref://synthetic/lighthouse'})
 add(p,'bmcLinks',{name:'mark-bmc-link',node:node.id,oobPort:'SW3'})
 add(p,'consolePorts',{name:'mark-console',port:1,device:node.id,baud:'115200'})
 Object.assign(p.config.hybrid,{s2sVpn:'used',onPremPublicIp:'203.0.113.77',onPremAsn:65421,azureAsn:65515,onPremBgpPeerIp:'169.254.21.1',sharedKeyRef:'keyvault://kv-synthetic/vpn-shared-key',localAddressSpaces:'192.0.2.0/24',p2sVpn:'used',p2sAddressPool:'172.16.201.0/24',expressRoute:'used',erProvider:'mark-er-provider'})
 Object.assign(p.config.outbound,{egressModel:'proxy-arc-gateway',proxyUrl:'http://mark-proxy.example.test:3128',arcGatewayId:'mark-arc-gateway'})
 Object.assign(p.config.backup,{solution:'azure-backup',retention:'mark-backup-retention'})
 Object.assign(p.config.monitoring,{solution:'azure-monitor',workspace:'mark-law'})
 Object.assign(p.config.azure,{witness:'cloud',witnessRef:'mark-witness'})
 Object.assign(p.config.sdn,{enabled:true,prefix:'MARKSDN'})
 return p
}

type Case=[string,(p:Project)=>void,[string,string][],string[],string[]]
const cases:Case[]=[
 ['TierPoint management in Azure',p=>{p.config.management.azurePlane='not-used'},[['management','managementServices']],['managementBindings'],['mark-azure-plane']],
 ['perimeter firewall',p=>{p.config.firewall.provider='not-used'},[['firewall','haGroupName']],['firewalls','firewallLinks'],['mark-fw-ha','mark-fw01','mark-fw-link']],
 ['top-of-rack switches',p=>{p.config.tor.provider='not-used'},[['tor','peerLinkPorts'],['tor','pfcPriority']],['torSwitches','nicLinks','firewallLinks'],['mark-tor-peer','mark-tor01','mark-nic-link']],
 ['out-of-band management',p=>{p.config.oob.model='not-used'},[['oob','ogHostname'],['oob','vlan']],['bmcLinks','consolePorts'],['mark-og01','mark-bmc-link','mark-console']],
 ['site-to-site VPN',p=>{p.config.hybrid.s2sVpn='not-used'},[['hybrid','onPremPublicIp'],['hybrid','onPremAsn']],[],['203.0.113.77','vpn_gateway_sku']],
 ['point-to-site VPN',p=>{p.config.hybrid.p2sVpn='not-used'},[['hybrid','p2sAddressPool']],[],['172.16.201.0/24']],
 ['ExpressRoute',p=>{p.config.hybrid.expressRoute='not-used'},[['hybrid','erProvider']],[],['mark-er-provider']],
 ['proxy and Arc gateway',p=>{p.config.outbound.egressModel='direct'},[['outbound','proxyUrl'],['outbound','arcGatewayId']],[],['mark-proxy','mark-arc-gateway']],
 ['backup',p=>{p.config.backup.solution='not-used'},[['backup','retention']],[],['mark-backup-retention']],
 ['monitoring',p=>{p.config.monitoring.solution='not-used'},[['monitoring','workspace']],[],['mark-law']],
 ['cluster witness',p=>{p.config.azure.witness='none'},[['azure','witnessRef']],[],['mark-witness']],
 ['SDN',p=>{p.config.sdn.enabled=false},[['sdn','prefix'],['sdn','reservedIp']],[],['MARKSDN']],
]

describe('component gates',()=>{
 it.each(cases)('%s: hidden when not used, retained after a round trip and excluded from infrastructure.yml',(_name,off,fields,groups,markers)=>{
  const p=fullDesign(),before=infrastructureYaml(p)
  for(const marker of markers)expect(before).toContain(marker)
  for(const [g,k] of fields)expect(applicable(p,g,k),`${g}.${k}`).toBe(true)
  for(const g of groups)expect(collectionActive(p,g),g).toBe(true)
  const snapshot=structuredClone({config:p.config,records:p.records})
  off(p)
  const reopened=reopen(p)
  for(const [g,k] of fields){expect(applicable(reopened,g,k),`${g}.${k}`).toBe(false);expect(reopened.config[g][k]).toEqual(snapshot.config[g][k])}
  for(const g of groups){expect(collectionActive(reopened,g),g).toBe(false);expect(activeRecords(reopened,g)).toEqual([]);expect(reopened.records[g]).toEqual(snapshot.records[g])}
  const after=infrastructureYaml(reopened)
  for(const marker of markers)expect(after).not.toContain(marker)
 })
 it('restores the hidden answers when the component is used again',()=>{
  const p=fullDesign();p.config.firewall.provider='not-used'
  const hidden=reopen(p);expect(infrastructureYaml(hidden)).not.toContain('mark-fw-ha')
  hidden.config.firewall.provider='tierpoint-fortinet'
  const restored=reopen(hidden);expect(applicable(restored,'firewall','haGroupName')).toBe(true);expect(infrastructureYaml(restored)).toContain('mark-fw-ha');expect(activeRecords(restored,'firewalls')).toHaveLength(2)
 })
 it('records every gate in the decisions list with defaults from the owner standards',()=>{
  const decisions=componentDecisions(newProject())
  expect(decisions.map(d=>d.gate)).toEqual(['management.azurePlane','architecture.identity','architecture.storage','architecture.switching','architecture.switchlessLinks','architecture.sanProtocol','firewall.provider','tor.provider','oob.model','hybrid.s2sVpn','hybrid.p2sVpn','hybrid.expressRoute','outbound.egressModel','sdn.enabled','azure.witness','backup.solution','monitoring.solution'])
  const byGate=Object.fromEntries(decisions.map(d=>[d.gate,d]))
  expect(byGate['firewall.provider']).toMatchObject({answer:'tierpoint-fortinet',in_use:true})
  expect(byGate['tor.provider']).toMatchObject({answer:'tierpoint-dell',in_use:true})
  expect(byGate['hybrid.p2sVpn']).toMatchObject({answer:'not-used',in_use:false})
  expect(byGate['architecture.sanProtocol']).toMatchObject({applicable:false,in_use:false})
 })
 it('shows the SDN opt-out reason only when SDN is off, and Toolkit metadata only when the Toolkit export is on',()=>{
  const p=newProject();expect(applicable(p,'sdn','optOutReason')).toBe(false);p.config.sdn.enabled=false;expect(applicable(p,'sdn','optOutReason')).toBe(true);expect(applicable(p,'sdn','existingState')).toBe(true)
  expect(applicable(p,'toolkit','siteCode')).toBe(false);expect(applicable(p,'toolkit','tagsJson')).toBe(true);p.config.toolkit.enabled=true;expect(applicable(p,'toolkit','siteCode')).toBe(true)
  const q=armFixture();expect(applicable(q,'arm','witnessAccount')).toBe(true);q.config.azure.witness='file-share';expect(applicable(q,'arm','witnessAccount')).toBe(false);expect(applicable(q,'azure','witnessRef')).toBe(true);q.config.azure.witness='unresolved';expect(applicable(q,'azure','witnessRef')).toBe(false)
 })
})

describe('undecided cluster witness',()=>{
 it('records an unresolved witness as not in use and emits no cluster_witness block',()=>{
  const p=fullDesign();expect(infra(p).compute.cluster_witness).toMatchObject({witness_type:'cloud',witness_reference:'mark-witness'})
  p.config.azure.witness='unresolved'
  const doc=infra(reopen(p))
  expect(doc.decisions.find((d:{gate:string})=>d.gate==='azure.witness')).toEqual({component:'cluster-witness',question:'Which cluster witness is used?',gate:'azure.witness',answer:'unresolved',applicable:true,in_use:false})
  expect(doc.compute).not.toHaveProperty('cluster_witness')
  const text=infrastructureYaml(reopen(p));expect(text).not.toContain('witness_type');expect(text).not.toContain('mark-witness')
  expect(assess(p).find(f=>f.id.startsWith('component:')&&f.group==='azure'&&f.field==='witness')).toMatchObject({severity:'review'})
 })
})

describe('S2D storage connectivity',()=>{
 const withNodes=(count:number)=>{const p=armFixture();while(p.records.nodes.length<count)add(p,'nodes',{name:`node${p.records.nodes.length+1}`,managementIp:`192.0.2.${20+p.records.nodes.length}`});p.config.architecture.switching='switchless';return p}
 const limit=(p:Project)=>assess(p).filter(f=>f.group==='architecture'&&f.field==='switching'&&f.message.includes('1–4'))
 it('allows switchless for 1 to 4 machines and blocks 5 or more',()=>{
  for(const count of [1,2,3,4])expect(limit(withNodes(count)),`${count} nodes`).toEqual([])
  for(const count of [5,8])expect(limit(withNodes(count))[0]).toMatchObject({severity:'error',category:'support'})
 })
 it('applies the 3-4 node switchless ARM-only, automatic IP and dual-link rules',()=>{
  const p=withNodes(4);p.config.arm.enableStorageAutoIp=true;p.config.architecture.switchlessLinks='single-link'
  const fields=assess(p).filter(f=>f.id.startsWith('component:')).map(f=>`${f.group}.${f.field}`)
  expect(fields).toEqual(expect.arrayContaining(['arm.enableStorageAutoIp','architecture.switchlessLinks']))
  p.config.architecture.route='portal';expect(assess(p).some(f=>f.id.startsWith('component:')&&f.field==='route')).toBe(true)
  expect(assess(withNodes(2)).some(f=>f.id.startsWith('component:')&&['route','switchlessLinks','enableStorageAutoIp'].includes(f.field))).toBe(false)
 })
 it('hides storage connectivity for SAN-only storage and skips its rules and data',()=>{
  const p=withNodes(6);p.config.architecture.storage='san'
  expect(applicable(p,'architecture','switching')).toBe(false);expect(applicable(p,'architecture','switchlessLinks')).toBe(false)
  expect(limit(p)).toEqual([]);expect(infra(p).networking.onprem.storage_connectivity).toBeUndefined();expect(infra(p).compute.clusters.azure_local.azl_network_topology).toBeUndefined()
  expect(reopen(p).config.architecture.switching).toBe('switchless')
 })
 it('asks for ToR storage DCB only when storage is switched, and RoCE needs non-zero VLANs',()=>{
  const p=armFixture();p.config.tor.storageVlans='0,712'
  expect(applicable(p,'tor','pfcPriority')).toBe(true);expect(infra(p).networking.onprem.tor_switches.storage_dcb).toMatchObject({rdma_type:'RoCEv2',pfc_priority:3,ets_percent:{smb_direct:50}})
  expect(assess(p).some(f=>f.group==='tor'&&f.field==='storageVlans'&&f.severity==='error')).toBe(true)
  p.config.tor.storageVlans='711,712';expect(assess(p).some(f=>f.group==='tor'&&f.field==='storageVlans')).toBe(false)
  p.config.architecture.switching='switchless'
  expect(applicable(p,'tor','pfcPriority')).toBe(false);expect(applicable(p,'tor','model')).toBe(true);expect(infra(p).networking.onprem.tor_switches).not.toHaveProperty('storage_dcb')
  expect(reopen(p).config.tor.storageVlans).toBe('711,712')
 })
 it('requires ToR switches for switched multi-node storage',()=>{
  const p=armFixture();p.config.tor.provider='not-used'
  expect(assess(p).find(f=>f.group==='tor'&&f.field==='provider')).toMatchObject({severity:'error'})
  p.config.architecture.switching='switchless';expect(assess(p).find(f=>f.group==='tor'&&f.field==='provider')).toMatchObject({severity:'review'})
 })
})

describe('external SAN protocol',()=>{
 const sanDesign=()=>{const p=armFixture();p.config.architecture.storage='san';const fabric=add(p,'fabrics',{name:'Fabric A',protocol:'fc'});return {p,fabric}}
 const visibility=(p:Project,fabric:{values:Record<string,string|number|boolean>})=>({protocol:applicable(p,'architecture','sanProtocol'),fcSwitch:applicable(p,'san','fcSwitchVendor'),zoningModel:applicable(p,'san','zoningModel'),iscsiIqn:applicable(p,'san','iscsiTargetIqn'),fabricZoning:fieldApplicable(field('fabrics','zoning',true),fabric.values,p.config),targetPortal:fieldApplicable(field('targets','portal',true),{},p.config)})
 it('Fibre Channel reveals fabric and zoning questions and hides iSCSI paths',()=>{
  const {p,fabric}=sanDesign()
  expect(visibility(p,fabric)).toEqual({protocol:true,fcSwitch:true,zoningModel:true,iscsiIqn:false,fabricZoning:true,targetPortal:false})
  Object.assign(p.config.san,{fcSwitchVendor:'synthetic-fc',iscsiTargetIqn:'iqn.2026-09.test.hidden:target'})
  const san=infra(p).networking.disaggregated.external_san
  expect(san).toMatchObject({protocol:'fc',array_vendor:'pure',fibre_channel:{switch_vendor:'synthetic-fc',zoning_model:'single-initiator-single-target'}});expect(san).not.toHaveProperty('iscsi')
  expect(infrastructureYaml(p)).not.toContain('iqn.2026-09.test.hidden')
 })
 it('iSCSI reveals path VLANs, subnets and portals and hides zoning',()=>{
  const {p,fabric}=sanDesign();p.config.architecture.sanProtocol='iscsi';fabric.values.protocol='iscsi'
  expect(visibility(p,fabric)).toEqual({protocol:true,fcSwitch:false,zoningModel:false,iscsiIqn:true,fabricZoning:false,targetPortal:true})
  Object.assign(p.config.san,{iscsiVlanA:300,iscsiVlanB:400,iscsiPortals:'192.0.2.50, 192.0.2.51',fcSwitchVendor:'synthetic-hidden-fc'})
  const san=infra(p).networking.disaggregated.external_san
  expect(san).toMatchObject({protocol:'iscsi',iscsi:{path_a:{vlan:300},path_b:{vlan:400},mtu:9014,target_portals:['192.0.2.50','192.0.2.51']}});expect(san).not.toHaveProperty('fibre_channel')
  expect(infrastructureYaml(p)).not.toContain('synthetic-hidden-fc')
  const findings=assess(p).filter(f=>f.record===fabric.id&&f.field==='protocol');expect(findings.every(f=>f.severity==='review')).toBe(true)
 })
 it('flags fabric protocol mismatches, pre-2604 releases and rack-aware SAN',()=>{
  const {p,fabric}=sanDesign();p.config.architecture.sanProtocol='iscsi'
  expect(assess(p).some(f=>f.record===fabric.id&&f.field==='protocol'&&f.severity==='error')).toBe(true)
  p.config.architecture.release='2511.0.0';p.config.architecture.topology='rack-aware'
  const component=assess(p).filter(f=>f.id.startsWith('component:')).map(f=>f.field);expect(component).toEqual(expect.arrayContaining(['release','topology']))
 })
 it('hides the whole SAN section for S2D storage and keeps its answers',()=>{
  const {p}=sanDesign();p.config.architecture.sanProtocol='iscsi';p.config.san.iscsiTargetIqn='iqn.2026-09.test.kept:target'
  p.config.architecture.storage='hybrid';expect(infrastructureYaml(p)).toContain('iqn.2026-09.test.kept')
  p.config.architecture.storage='s2d'
  const reopened=reopen(p)
  expect(activeBranch(settings.find(g=>g.key==='san')!.branch,reopened.config)).toBe(false);expect(applicable(reopened,'architecture','sanProtocol')).toBe(false)
  expect(infra(reopened).networking).not.toHaveProperty('disaggregated');expect(reopened.config.san.iscsiTargetIqn).toBe('iqn.2026-09.test.kept:target')
 })
})

describe('master infrastructure.yml',()=>{
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const registry=load(readFileSync(new URL('./contracts/toolkit/master-registry.yaml',import.meta.url),'utf8')) as any
 it('follows the pinned master-registry shape for devices, VLANs, VPN and nodes',()=>{
  const p=fullDesign()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc=load(infrastructureYaml(p)) as any
  expect(doc).toEqual(masterInfrastructure(p))
  expect(Object.keys(doc)).toEqual(expect.arrayContaining(['_metadata','decisions','azure_platform','identity','networking','compute','operations']))
  expect(doc._metadata).toMatchObject({schema_version:SCHEMA,registry:{version:'4.0.0'},runtime_qualified:false,contains_executable_code:false})
  expect(doc.decisions).toHaveLength(17)
  const devices=doc.networking.onprem.network_devices,properties=registry.networking.onprem.network_devices.items.properties,extensions=['device_purpose','device_oob_ip','device_vlt_priority','device_credential_reference']
  expect(devices.map((d:any)=>`${d.device_type}/${d.device_role}/${d.device_vendor}`)).toEqual(['firewall/primary/Fortinet','firewall/secondary/Fortinet','switch/primary/Dell','switch/secondary/Dell','console_server/standalone/OpenGear'])
  for(const d of devices){
   for(const key of registry.networking.onprem.network_devices.items.required)if(d.device_type!=='console_server'||key!=='device_management_ip')expect(d,key).toHaveProperty(key)
   for(const key of Object.keys(d))if(!extensions.includes(key))expect(properties,key).toHaveProperty(key)
   expect(properties.device_type.allowedValues).toContain(d.device_type);expect(properties.device_role.allowedValues).toContain(d.device_role);expect(properties.device_vendor.allowedValues).toContain(d.device_vendor)
  }
  expect(devices[0]).toMatchObject({device_hostname:'mark-fw01',device_ha_enabled:true,device_ha_mode:'active-passive',device_ha_priority:200,device_wan_ip:'198.51.100.10',device_password_secret:'keyvault://kv-synthetic/fortigate-admin'})
  expect(devices[2]).toMatchObject({device_credential_reference:'secret-ref://synthetic/switch-admin'});expect(devices[2]).not.toHaveProperty('device_password_secret')
  for(const key of Object.keys(doc.networking.onprem.vlans))expect(registry.networking.onprem.vlans,key).toHaveProperty(key)
  expect(doc.networking.onprem.vlans).toMatchObject({vlan_oob_id:210,vlan_oob_cidr:'192.0.2.192/26',vlan_storage_networks:[{vlan_id:701,routable:false},{vlan_id:702,routable:false}]})
  const vpn=doc.networking.hybrid.vpn,vpnExtensions=['azure_address_prefixes','vpn_connection_ipsec_policy_mode','vpn_connection_custom_policy','vpn_shared_key_reference','p2s_entra_tenant_url','p2s_entra_audience','p2s_radius_servers','p2s_radius_secret_reference']
  for(const key of Object.keys(vpn))if(!vpnExtensions.includes(key))expect(registry.networking.hybrid.vpn,key).toHaveProperty(key)
  expect(vpn).toMatchObject({vpn_gateway_sku:'VpnGw2AZ',local_gateway_ip:'203.0.113.77',local_gateway_bgp_asn:65421,vpn_gateway_bgp_asn:65515,local_gateway_address_prefixes:['192.0.2.0/24'],vpn_shared_key_secret:'keyvault://kv-synthetic/vpn-shared-key',p2s_client_address_pool:'172.16.201.0/24',p2s_vpn_client_protocols:['OpenVPN'],p2s_authentication_type:'AAD'})
  expect(registry.networking.hybrid.vpn.p2s_authentication_type.allowedValues).toContain(vpn.p2s_authentication_type)
  expect(doc.networking.hybrid.expressroute.provider).toBe('mark-er-provider')
  expect(doc.networking.onprem.port_maps).toMatchObject({node_nic_to_tor:[{tor_switch:'mark-tor01',tor_port:'ethernet1/1/3',node:'node1'}],firewall_to_tor:[{firewall:'mark-fw01',firewall_port:'wan2'}],bmc_to_oob:[{node:'node1',bmc:'203.0.113.11',oob_port:'SW3'}],console_ports:[{port:1,device:'node1',baud:115200}]})
  expect(doc.networking.onprem.out_of_band.opengear.lighthouse).toMatchObject({address:'lighthouse.example.test',port:443,enrollment_token_reference:'secret-ref://synthetic/lighthouse'})
  expect(doc.networking.onprem.network_intents[0]).toMatchObject({name:'Converged',traffic_types:['Management','Compute','Storage'],adapter_names:['pNIC1','pNIC2']})
  expect(doc.compute.cluster_nodes).toEqual([{node_hostname:'node1',node_management_ip:'192.0.2.11',node_idrac_ip:'203.0.113.11'},{node_hostname:'node2',node_management_ip:'192.0.2.12',node_idrac_ip:'203.0.113.12'}])
  expect(doc.networking.azure.sdn).toMatchObject({sdn_enabled:true,sdn_prefix:'MARKSDN'})
  expect(doc.networking.outbound).toMatchObject({egress_model:'proxy-arc-gateway',proxy_url:'http://mark-proxy.example.test:3128',arc_gateway_resource_id:'mark-arc-gateway'})
 })
 it('records a customer firewall without TierPoint firewall devices',()=>{
  const p=fullDesign();Object.assign(p.config.firewall,{provider:'customer',customerVendor:'Synthetic vendor',customerOwner:'Customer network team'})
  const doc=infra(p)
  expect(doc.networking.onprem.firewall).toMatchObject({provider:'customer',vendor:'Synthetic vendor',owner:'Customer network team'});expect(doc.networking.onprem.firewall).not.toHaveProperty('ha_mode')
  expect(doc.networking.onprem.network_devices.some((d:any)=>d.device_type==='firewall')).toBe(false)
  expect(assess(p).some(f=>f.group==='firewall'&&f.field==='httpsInspectionDisabled')).toBe(true)
 })
 it('is part of private packages only and contains data, not scripts',async()=>{
  const p=fullDesign(),files=await exportFiles(p,false,false)
  expect(load(String(files['infrastructure.yml']))).toEqual(masterInfrastructure(parseProject(canonical(p))))
  expect(String(files['README.md'])).toContain('infrastructure.yml')
  expect(Object.keys(files).filter(path=>/\.(ps1|psm1|sh|py|tf|bicep)$/i.test(path))).toEqual([])
  const shared=await exportFiles(p,true,false);expect(shared).not.toHaveProperty('infrastructure.yml')
 })
})

describe('component rules',()=>{
 it('checks witness, private path, BGP, point-to-site, ExpressRoute and MABS limits',()=>{
  const p=fullDesign()
  Object.assign(p.config.azure,{witness:'none'});Object.assign(p.config.outbound,{egressModel:'private-path'});Object.assign(p.config.hybrid,{onPremAsn:65515,p2sTunnel:'IKEv2',expressRoute:'used',erPeerAsn:65517});Object.assign(p.config.backup,{solution:'mabs',mabsAuth:'domain'});p.config.architecture.identity='local'
  const fields=assess(p).filter(f=>f.id.startsWith('component:')&&f.severity==='error').map(f=>`${f.group}.${f.field}`)
  expect(fields).toEqual(expect.arrayContaining(['azure.witness','outbound.egressModel','hybrid.onPremAsn','hybrid.p2sAuth','hybrid.erPeerAsn','backup.mabsAuth']))
 })
})
