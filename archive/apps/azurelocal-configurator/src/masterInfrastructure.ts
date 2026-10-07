/**
 * Master infrastructure.yml: design data only. No scripts, templates or executable content.
 *
 * Shape: the pinned Azure Local Toolkit master-registry v4.0.0 (src/contracts/toolkit/master-registry.yaml).
 * Registry keys used as written: site, environment, azure_platform.azure_tenants, identity,
 * compute.clusters.azure_local.azl_*, compute.cluster_nodes[].node_*, networking.onprem.vlans.vlan_*,
 * networking.onprem.network_intents[], networking.onprem.network_devices[].device_* (registry array shape),
 * networking.hybrid.vpn.vpn_gateway_* / local_gateway_* / vpn_connection_* / p2s_* / vpn_client_root_certificate_name,
 * networking.azure.sdn.sdn_enabled, sdn_prefix, sdn_dns_mode, sdn_nc_reserved_ip.
 *
 * Configurator extensions (no registry key exists):
 * - _metadata: generator, versions, registry pin and qualification.
 * - decisions[]: every component gate, its answer, whether it applies and whether the component is in use.
 * - networking.onprem.networks[], storage_connectivity, firewall, tor_switches, out_of_band, port_maps.
 * - network_devices[] extra keys: device_purpose, device_oob_ip, device_vlt_priority, device_credential_reference
 *   (used when a credential is a secret-ref:// reference, which the registry keyvault:// pattern rejects).
 * - networking.hybrid.vpn: azure_address_prefixes, vpn_connection_ipsec_policy_mode, vpn_connection_custom_policy,
 *   vpn_shared_key_reference, p2s_entra_tenant_url, p2s_entra_audience, p2s_radius_servers, p2s_radius_secret_reference.
 * - networking.hybrid.expressroute, networking.outbound, networking.disaggregated.external_san.
 * - azure_platform.tierpoint_management, compute.cluster_witness, operations.backup, operations.monitoring.
 *
 * Deviations: the hand-maintained infrastructure.schema.json declares network_devices as an object and forbids unknown
 * root keys such as decisions, so this file follows the registry and is not validated against that schema.
 * Only components in use appear. An undecided answer (witness "unresolved") is recorded in decisions as not in use. Answers hidden by a "not used" decision stay in project.json and never reach this file.
 * Secrets appear only as the references entered in the design.
 */
import {dump} from 'js-yaml'
import {S2D_STORAGE,SAN_STORAGE,type Value} from './catalog'
import {activeRecords} from './selectors'
import {APP_VERSION,type Project} from './project'
import lock from './contracts/toolkit/source-lock.json'
export const REGISTRY_VENDORS=['Dell','Fortinet','Cisco','Arista','Ubiquiti','OpenGear','HPE','Juniper']
export interface Decision {component:string;question:string;gate:string;answer:Value;applicable:boolean;in_use:boolean}
export function componentDecisions(p:Project):Decision[]{
 const c=p.config,a=c.architecture,s2d=S2D_STORAGE.includes(String(a.storage)),san=SAN_STORAGE.includes(String(a.storage))
 const rows:[string,string,string,string,boolean,(v:Value)=>boolean][]=[
  ['tierpoint-management-azure','Is TierPoint management in Azure used?','management','azurePlane',true,v=>v==='used'],
  ['identity','Which cluster identity is used?','architecture','identity',true,()=>true],
  ['storage-architecture','Which storage architecture is used?','architecture','storage',true,()=>true],
  ['s2d-storage-connectivity','Is S2D storage switched or switchless?','architecture','switching',s2d,()=>true],
  ['switchless-links','Single or dual switchless storage links?','architecture','switchlessLinks',s2d&&a.switching==='switchless',()=>true],
  ['external-san-protocol','Which SAN protocol is used?','architecture','sanProtocol',san,()=>true],
  ['perimeter-firewall','Which perimeter firewall is used?','firewall','provider',true,v=>v!=='not-used'],
  ['top-of-rack-switches','Which top-of-rack switches are used?','tor','provider',true,v=>v!=='not-used'],
  ['out-of-band-management','Which out-of-band management is used?','oob','model',true,v=>v!=='not-used'],
  ['site-to-site-vpn','Is an Azure site-to-site VPN used?','hybrid','s2sVpn',true,v=>v==='used'],
  ['point-to-site-vpn','Is a point-to-site VPN used?','hybrid','p2sVpn',true,v=>v==='used'],
  ['expressroute','Is ExpressRoute private connectivity used?','hybrid','expressRoute',true,v=>v==='used'],
  ['outbound-arc-gateway-proxy','Which outbound connectivity model is used?','outbound','egressModel',true,()=>true],
  ['sdn','Is Azure Local SDN enabled by Arc used?','sdn','enabled',true,v=>v===true],
  ['cluster-witness','Which cluster witness is used?','azure','witness',true,v=>v!=='none'&&v!=='unresolved'],
  ['backup','Which backup solution is used?','backup','solution',true,v=>v!=='not-used'],
  ['monitoring','Which monitoring is used?','monitoring','solution',true,v=>v!=='not-used'],
 ]
 return rows.map(([component,question,group,key,applicable,used])=>{const answer=c[group][key];return {component,question,gate:`${group}.${key}`,answer,applicable,in_use:applicable&&used(answer)}})
}
const text=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():undefined
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined
const positive=(v:unknown)=>typeof v==='number'&&v>0?v:undefined
const list=(v:unknown)=>{const items=String(v??'').split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);return items.length?items:undefined}
const vendor=(v:unknown)=>{const name=text(v);return name?REGISTRY_VENDORS.find(x=>x.toLowerCase()===name.toLowerCase())??name:undefined}
const credential=(ref:unknown,registryKey:string)=>{const v=text(ref);return !v?{}:/^keyvault:\/\/[a-z0-9-]+\/.+$/.test(v)?{[registryKey]:v}:{[registryKey.replace(/_secret$/,'_reference').replace('device_password_reference','device_credential_reference')]:v}}
function compact(v:unknown):unknown{
 if(Array.isArray(v))return v.map(compact)
 if(v&&typeof v==='object'){const out:Record<string,unknown>={};for(const [k,x]of Object.entries(v)){const y=compact(x);if(y===undefined||y===null||y==='')continue;if(y&&typeof y==='object'&&!Array.isArray(y)&&!Object.keys(y).length)continue;out[k]=y}return out}
 return v
}
const TRAFFIC:Record<string,string[]>={'management-compute':['Management','Compute'],'management-compute-storage':['Management','Compute','Storage'],'compute-storage':['Compute','Storage'],storage:['Storage'],management:['Management'],compute:['Compute']}
export function masterInfrastructure(p:Project):Record<string,unknown>{
 const c=p.config,a=c.architecture,records=(key:string)=>activeRecords(p,key)
 const nameOf=(id:unknown)=>{if(!id)return undefined;for(const rows of Object.values(p.records)){const row=rows.find(r=>r.id===id);if(row)return String(row.values.name||row.id)}return undefined}
 const decisions=componentDecisions(p),used=(component:string)=>decisions.find(d=>d.component===component)!.in_use
 const s2d=S2D_STORAGE.includes(String(a.storage)),san=SAN_STORAGE.includes(String(a.storage)),switchless=s2d&&a.switching==='switchless',switched=s2d&&a.switching==='switched'
 const fw=c.firewall,tor=c.tor,oob=c.oob,h=c.hybrid,o=c.outbound
 const fortinet=fw.provider==='tierpoint-fortinet',torUsed=used('top-of-rack-switches'),oobUsed=used('out-of-band-management'),opengear=oob.model==='opengear'
 const nodes=records('nodes'),networks=records('networks'),adapters=records('adapters'),storageLinks=records('storageLinks')
 const portName=(id:unknown)=>{const port=p.records.adapters.find(x=>x.id===id);return port?text(port.values.osName)??text(port.values.port)??text(port.values.name):undefined}
 const mgmt=networks.find(n=>n.values.role==='management'),oobNet=networks.find(n=>n.values.role==='oob')
 const vlans={
  ...(mgmt?{vlan_management_compute_id:num(mgmt.values.vlan),vlan_management_compute_name:text(mgmt.values.name),vlan_management_compute_cidr:text(mgmt.values.cidr),vlan_management_compute_gateway:text(mgmt.values.gateway)}:{}),
  ...(oobUsed&&(positive(oob.vlan)||text(oob.cidr)||oobNet)?{vlan_oob_id:positive(oob.vlan)??num(oobNet?.values.vlan),vlan_oob_name:text(oobNet?.values.name)??'oob',vlan_oob_cidr:text(oob.cidr)??text(oobNet?.values.cidr),vlan_oob_gateway:text(oob.gateway)??text(oobNet?.values.gateway)}:{}),
  ...(s2d?{vlan_storage_networks:networks.filter(n=>n.values.role==='s2d-storage').map(n=>({vlan_id:num(n.values.vlan),name:text(n.values.name),cidr:text(n.values.cidr),routable:false}))}:{}),
 }
 const physicalNetworks=networks.filter(n=>(n.values.role!=='oob'||oobUsed)&&(n.values.role!=='s2d-storage'||s2d)&&(n.values.role!=='iscsi'||(san&&a.sanProtocol==='iscsi'))).map(n=>({name:text(n.values.name),role:n.values.role,vlan:num(n.values.vlan),cidr:text(n.values.cidr),gateway:text(n.values.gateway),pool_start:text(n.values.poolStart),pool_end:text(n.values.poolEnd),mtu:positive(n.values.mtu),rdma:n.values.rdma}))
 const intents=records('intents').map(i=>({name:text(i.values.name),traffic_types:TRAFFIC[String(i.values.traffic)]??[],adapter_names:[...new Set(adapters.filter(x=>x.values.intent===i.id).map(x=>String(x.values.osName||x.values.port||x.values.name)).filter(Boolean))]}))
 const devices:Record<string,unknown>[]=[]
 if(fortinet)for(const unit of records('firewalls'))devices.push({device_type:'firewall',device_role:unit.values.role,device_hostname:text(unit.values.name),device_management_ip:text(unit.values.managementIp),device_vendor:'Fortinet',device_model:text(fw.model),device_firmware_version:text(fw.osVersion),device_serial_number:text(unit.values.serial),device_ha_enabled:fw.haMode!=='standalone',device_ha_mode:fw.haMode==='standalone'?undefined:fw.haMode,device_ha_priority:positive(unit.values.haPriority),device_ha_sync_interface:text(unit.values.heartbeatPorts),device_wan_ip:text(unit.values.wanIp),device_rack_position:text(unit.values.rackPosition),device_purpose:'perimeter-firewall',device_oob_ip:text(unit.values.oobIp),...credential(fw.credentialRef,'device_password_secret')})
 if(torUsed)for(const unit of records('torSwitches'))devices.push({device_type:'switch',device_role:unit.values.role,device_hostname:text(unit.values.name),device_management_ip:text(unit.values.managementIp),device_vendor:tor.provider==='tierpoint-dell'?'Dell':vendor(tor.customerVendor),device_model:text(tor.model),device_firmware_version:text(tor.osVersion),device_serial_number:text(unit.values.serial),device_ha_enabled:tor.pairMode!=='single',device_rack_position:text(unit.values.rackPosition),device_purpose:'top-of-rack',device_oob_ip:text(unit.values.oobIp),device_vlt_priority:positive(unit.values.vltPriority),...credential(unit.values.credentialRef,'device_password_secret')})
 if(oob.model==='oob-switch')devices.push({device_type:'switch',device_role:'standalone',device_hostname:text(oob.switchHostname),device_management_ip:text(oob.switchManagementIp),device_management_vlan:positive(oob.vlan),device_vendor:vendor(oob.switchVendor),device_model:text(oob.switchModel),device_purpose:'out-of-band'})
 if(opengear)devices.push({device_type:'console_server',device_role:'standalone',device_hostname:text(oob.ogHostname),device_management_ip:text(oob.ogManagementIp),device_management_vlan:positive(oob.vlan),device_vendor:'OpenGear',device_model:text(oob.ogModel),device_serial_ports:positive(oob.serialPorts),device_purpose:'out-of-band-console'})
 const firewall=fortinet?{provider:fw.provider,vendor:'Fortinet',model:fw.model,os_version:text(fw.osVersion),ha_mode:fw.haMode,ha_group_name:text(fw.haGroupName),wan_cidr:text(fw.wanCidr),wan_gateway:text(fw.wanGateway),public_ips:list(fw.publicIps),vlan_gateways:text(fw.gatewayVlans),dhcp_scopes:text(fw.dhcpScopes),vdom_mode:fw.vdomMode,vdoms:fw.vdomMode==='multi-vdom'?text(fw.vdoms):undefined,central_management:fw.centralManagement,log_targets:text(fw.logTargets),credential_reference:text(fw.credentialRef)}
  :fw.provider==='customer'?{provider:fw.provider,vendor:text(fw.customerVendor),model:text(fw.customerModel),owner:text(fw.customerOwner),contact:text(fw.customerContact),gateway_ips:list(fw.customerGatewayIps),endpoint_approach:text(fw.endpointApproach),https_inspection_disabled:fw.httpsInspectionDisabled}:undefined
 const paired=tor.pairMode!=='single'
 const torSwitches=torUsed?{provider:tor.provider,vendor:tor.provider==='tierpoint-dell'?'Dell':text(tor.customerVendor),owner:tor.provider==='customer'?text(tor.customerOwner):undefined,model:text(tor.model),os:tor.os,os_version:text(tor.osVersion),pair_mode:tor.pairMode,domain_id:paired?positive(tor.vltDomain):undefined,peer_link_ports:paired?text(tor.peerLinkPorts):undefined,backup_destination:paired?text(tor.backupDestination):undefined,uplinks:text(tor.uplinks),mtu:positive(tor.mtu),
  storage_dcb:switched?{storage_vlans:list(tor.storageVlans)?.map(Number),rdma_type:tor.rdmaType,pfc_priority:num(tor.pfcPriority),ets_percent:{smb_direct:num(tor.etsSmbPercent),cluster:num(tor.etsClusterPercent),default:num(tor.etsDefaultPercent)}}:undefined}:undefined
 const outOfBand=oobUsed?{model:oob.model,vlan:positive(oob.vlan),cidr:text(oob.cidr),gateway:text(oob.gateway),
  oob_switch:oob.model==='oob-switch'?{vendor:text(oob.switchVendor),model:text(oob.switchModel),hostname:text(oob.switchHostname),management_ip:text(oob.switchManagementIp),uplink:text(oob.switchUplink)}:undefined,
  opengear:opengear?{model:text(oob.ogModel),hostname:text(oob.ogHostname),management_ip:text(oob.ogManagementIp),serial_ports:positive(oob.serialPorts),lighthouse:{address:text(oob.lighthouseAddress),port:positive(oob.lighthousePort),enrollment_token_reference:text(oob.enrollmentTokenRef),enrollment_bundle:text(oob.enrollmentBundle)},internet_uplink:text(oob.internetUplink),cellular_failover:oob.cellularFailover,cellular_apn:oob.cellularFailover===true?text(oob.cellularApn):undefined}:undefined}:undefined
 const portMaps={
  node_nic_to_tor:torUsed?records('nicLinks').map(l=>{const port=adapters.find(x=>x.id===l.values.adapter);return {name:text(l.values.name),node:nameOf(port?.values.node),adapter:nameOf(l.values.adapter),adapter_port:text(port?.values.port),tor_switch:nameOf(l.values.torSwitch),tor_port:text(l.values.torPort),mode:l.values.mode,vlans:text(l.values.vlans)}}):undefined,
  firewall_to_tor:fortinet&&torUsed?records('firewallLinks').map(l=>({name:text(l.values.name),firewall:nameOf(l.values.firewall),firewall_port:text(l.values.firewallPort),tor_switch:nameOf(l.values.torSwitch),tor_port:text(l.values.torPort),mode:l.values.mode,vlans:text(l.values.vlans)})):undefined,
  bmc_to_oob:oobUsed?records('bmcLinks').map(l=>({name:text(l.values.name),node:nameOf(l.values.node),bmc:text(nodes.find(n=>n.id===l.values.node)?.values.bmc),oob_port:text(l.values.oobPort),vlan:text(l.values.vlan)})):undefined,
  console_ports:opengear?records('consolePorts').map(l=>({label:text(l.values.name),port:num(l.values.port),device:nameOf(l.values.device)??text(l.values.deviceLabel),baud:Number(l.values.baud),pinout:l.values.pinout})):undefined,
 }
 const bgp=h.bgpEnabled===true,s2s=h.s2sVpn==='used',p2s=h.p2sVpn==='used'
 const vpn=s2s||p2s?{
  ...(s2s?{vpn_gateway_type:'Vpn',vpn_gateway_vpn_type:'RouteBased',vpn_gateway_sku:h.vpnGatewaySku,vpn_gateway_active_active:h.vpnActiveActive,vpn_gateway_subnet_address_prefix:text(h.gatewaySubnet),vpn_gateway_bgp_enabled:bgp,
   ...(bgp?{vpn_gateway_bgp_asn:positive(h.azureAsn),vpn_gateway_bgp_peering_address:text(h.azureBgpPeerIp)}:{}),
   local_gateway_ip:text(h.onPremPublicIp),local_gateway_device:fortinet?String(fw.model):fw.provider==='customer'?text(fw.customerModel):undefined,local_gateway_address_prefixes:list(h.localAddressSpaces),
   ...(bgp?{local_gateway_bgp_asn:positive(h.onPremAsn),local_gateway_bgp_peering_address:text(h.onPremBgpPeerIp)}:{}),
   azure_address_prefixes:list(h.azureAddressSpaces),vpn_connection_type:'IPsec',vpn_connection_protocol:h.ikeVersion,vpn_connection_enable_bgp:bgp,vpn_connection_dpd_timeout_seconds:positive(h.dpdTimeout),vpn_connection_ipsec_policy_mode:h.ipsecPolicy,
   vpn_connection_custom_policy:h.ipsecPolicy==='custom'?{ike_proposal:text(h.ikeProposal),ipsec_proposal:text(h.ipsecProposal)}:undefined,...credential(h.sharedKeyRef,'vpn_shared_key_secret')}:{}),
  ...(p2s?{p2s_client_address_pool:text(h.p2sAddressPool),p2s_vpn_client_protocols:String(h.p2sTunnel).split('-').map(x=>x==='IKEv2'?'IkeV2':x),p2s_authentication_type:({'entra-id':'AAD',certificate:'Certificate',radius:'Radius'} as Record<string,string>)[String(h.p2sAuth)],
   ...(h.p2sAuth==='entra-id'?{p2s_entra_tenant_url:text(h.p2sEntraTenant),p2s_entra_audience:text(h.p2sEntraAudience)}:{}),
   ...(h.p2sAuth==='certificate'?{vpn_client_root_certificate_name:text(h.p2sRootCertificate)}:{}),
   ...(h.p2sAuth==='radius'?{p2s_radius_servers:list(h.p2sRadiusServers),p2s_radius_secret_reference:text(h.p2sRadiusSecretRef)}:{})}:{}),
 }:undefined
 const expressroute=h.expressRoute==='used'?{provider:text(h.erProvider),circuit:text(h.erCircuit),peering_location:text(h.erPeeringLocation),bandwidth_mbps:positive(h.erBandwidthMbps),sku:h.erSku,billing_model:h.erBilling,private_peering:{primary_subnet:text(h.erPrimarySubnet),secondary_subnet:text(h.erSecondarySubnet),vlan_id:positive(h.erVlanId),peer_asn:positive(h.erPeerAsn),md5_key_reference:text(h.erMd5Ref)},gateway:{sku:text(h.erGatewaySku),subnet:text(h.erGatewaySubnet)}}:undefined
 const proxy=['proxy','proxy-arc-gateway'].includes(String(o.egressModel)),arcGateway=['arc-gateway','proxy-arc-gateway','private-path'].includes(String(o.egressModel))
 const outbound={egress_model:o.egressModel,proxy_url:proxy?text(o.proxyUrl):undefined,proxy_bypass_list:proxy?text(o.proxyBypass):undefined,arc_gateway_resource_id:arcGateway?text(o.arcGatewayId):undefined,private_path:o.egressModel==='private-path'?{azure_firewall_private_ip:text(o.privateFirewallIp),explicit_proxy_port:positive(o.privateFirewallPort)}:undefined,endpoint_evidence:text(o.endpointEvidence)}
 const externalSan=san?{protocol:a.sanProtocol,array_vendor:c.san.arrayVendor,administered_by:c.san.administeredBy,
  fibre_channel:a.sanProtocol==='fc'?{switch_vendor:text(c.san.fcSwitchVendor),fabric_a_switch:text(c.san.fabricASwitch),fabric_b_switch:text(c.san.fabricBSwitch),zoning_model:c.san.zoningModel}:undefined,
  iscsi:a.sanProtocol==='iscsi'?{path_a:{vlan:positive(c.san.iscsiVlanA),subnet:text(c.san.iscsiSubnetA)},path_b:{vlan:positive(c.san.iscsiVlanB),subnet:text(c.san.iscsiSubnetB)},mtu:positive(c.san.iscsiMtu),target_portals:list(c.san.iscsiPortals),target_iqn:text(c.san.iscsiTargetIqn)}:undefined,
  fabrics:records('fabrics').map(f=>({name:text(f.values.name),protocol:f.values.protocol,failure_domain:text(f.values.failureDomain),speed_gbps:positive(f.values.speedGbps)}))}:undefined
 const sdn=c.sdn.enabled===true?{sdn_enabled:true,sdn_prefix:text(c.sdn.prefix),sdn_dns_mode:c.sdn.dnsMode==='ad-dynamic'?'dynamic':'static',sdn_nc_reserved_ip:text(c.sdn.reservedIp)}:{sdn_enabled:false}
 const witness=c.azure.witness
 const sites=records('sites'),site=sites.find(s=>s.id===c.toolkit.site)??sites[0],toolkit=c.toolkit.enabled===true
 const bk=c.backup,mon=c.monitoring
 const result={
  _metadata:{generator:'azurelocal-configurator',app_version:APP_VERSION,schema_version:p.schemaVersion,project_id:p.id,revision:p.revision,generated_at:p.updatedAt,registry:{name:'master-registry',version:'4.0.0',source_commit:lock.commit},qualification:'design-data',runtime_qualified:false,contains_executable_code:false},
  decisions,
  site:{code:toolkit?text(c.toolkit.siteCode):undefined,name:text(site?.values.name)},
  environment:toolkit?{env_name:text(c.toolkit.environmentName),env_type:c.toolkit.environmentType==='unresolved'?undefined:c.toolkit.environmentType}:undefined,
  azure_platform:{azure_tenants:{aztenant_azurelocal_id:text(c.azure.tenant),aztenant_region:text(c.azure.region)},
   tierpoint_management:used('tierpoint-management-azure')?{landing_zone:c.management.landingZone,subscription:text(c.management.managementSubscription),region:text(c.management.managementRegion),hub_vnet_address_space:list(c.management.hubCidr),services:text(c.management.managementServices)}:undefined},
  identity:{identity_provider:a.identity==='local'?'local_identity':'active_directory',...(a.identity==='ad'?{active_directory:{ad_domain_fqdn:text(c.identity.domain),ad_ou_path:text(c.identity.ou)}}:{local_identity:{cluster_keyvault_name:text(c.identity.vault),local_admin_username:text(c.identity.localUser)}}),dns_servers:list(c.identity.dnsServers)},
  networking:{
   azure:{sdn},
   onprem:{vlans,networks:physicalNetworks,network_intents:intents,
    storage_connectivity:s2d?{azl_network_topology:switchless?'switchless':'traditional',storage_connectivity_switchless:switchless,switchless_links:switchless?a.switchlessLinks:undefined,enable_storage_auto_ip:a.route==='portal'?undefined:c.arm.enableStorageAutoIp,
     node_to_node_links:switchless&&storageLinks.length?storageLinks.map(l=>({name:text(l.values.name),link_index:positive(l.values.linkIndex),node_a:nameOf(l.values.nodeA),port_a:portName(l.values.portA),node_b:nameOf(l.values.nodeB),port_b:portName(l.values.portB),subnet:text(l.values.subnet),vlan:positive(l.values.vlan)})):undefined}:undefined,
    network_devices:devices,firewall,tor_switches:torSwitches,out_of_band:outOfBand,port_maps:portMaps},
   hybrid:{vpn,expressroute},
   outbound,
   disaggregated:externalSan?{external_san:externalSan}:undefined,
  },
  compute:{
   clusters:{azure_local:{azl_name:text(c.azure.clusterName),azl_node_count:nodes.length,azl_identity_provider:a.identity==='local'?'local_identity':'active_directory',azl_network_topology:s2d?(switchless?'switchless':'traditional'):undefined,azl_storage_architecture:a.storage}},
   cluster_nodes:nodes.map(n=>({node_hostname:text(n.values.name),node_management_ip:text(n.values.managementIp),node_idrac_ip:text(n.values.bmc),node_serial_number:text(n.values.serial),node_model:text(n.values.model)})),
   cluster_witness:used('cluster-witness')?{witness_type:witness,witness_reference:['cloud','file-share','existing'].includes(String(witness))?text(c.azure.witnessRef):undefined}:undefined,
  },
  operations:{
   backup:used('backup')?{solution:bk.solution,vault:text(bk.vault),retention:text(bk.retention),rpo:text(bk.rpo),rto:text(bk.rto),mabs:bk.solution==='mabs'?{scope:bk.mabsScope,authentication:bk.mabsAuth}:undefined,product:bk.solution==='third-party'?text(bk.product):undefined,dedicated_network:bk.dedicatedNetwork===true?{vlan:positive(bk.vlan)}:undefined}:undefined,
   monitoring:used('monitoring')?{solution:mon.solution,workspace:['azure-monitor','tierpoint-noc'].includes(String(mon.solution))?text(mon.workspace):undefined,data_collection_rule:['azure-monitor','tierpoint-noc'].includes(String(mon.solution))?text(mon.dataCollectionRule):undefined,alert_recipients:['azure-monitor','tierpoint-noc'].includes(String(mon.solution))?text(mon.alertRecipients):undefined,service_tier:mon.solution==='tierpoint-noc'?mon.serviceTier:undefined,device_telemetry:mon.solution==='tierpoint-noc'?mon.deviceTelemetry:undefined,customer_tool:mon.solution==='customer-tool'?text(mon.customerTool):undefined}:undefined,
  },
 }
 return compact(result) as Record<string,unknown>
}
export const INFRASTRUCTURE_PATH='infrastructure.yml'
export const infrastructureYaml=(p:Project)=>dump(masterInfrastructure(p),{noRefs:true,sortKeys:false,lineWidth:120})
export const decisionRows=(p:Project):unknown[][]=>componentDecisions(p).map(d=>[d.component,d.gate,d.answer,d.applicable?(d.in_use?'In use':'Not used'):'Not applicable'])
