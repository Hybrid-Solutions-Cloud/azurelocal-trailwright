import type {Project} from './project'
import type {Finding} from './assessment'
import {collections,settings,S2D_STORAGE,SAN_STORAGE} from './catalog'
import {activeRecords} from './selectors'
/** Platform limits for the schema 9 component decisions. Sources: research/network-decisions/microsoft-network-requirements.md. */
const NETCONS='https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609'
const ATC='https://learn.microsoft.com/windows-server/networking/network-atc/network-atc'
const SANCONN='https://learn.microsoft.com/azure/azure-local/deploy/enable-external-storage?view=azloc-2609'
const QUORUM='https://learn.microsoft.com/windows-server/storage/storage-spaces/quorum#cluster-quorum-overview'
const PRIVPATH='https://learn.microsoft.com/azure/azure-local/deploy/deployment-with-azure-arc-gateway-private-path?view=azloc-2609'
const FW='https://learn.microsoft.com/azure/azure-local/concepts/firewall-requirements?view=azloc-2609'
const VPNBGP='https://learn.microsoft.com/azure/vpn-gateway/bgp-howto'
const P2S='https://learn.microsoft.com/azure/vpn-gateway/point-to-site-about#how-are-p2s-vpn-clients-authenticated'
const ERPEER='https://learn.microsoft.com/azure/expressroute/expressroute-howto-routing-portal-resource-manager#azure-private-peering'
const MABS='https://learn.microsoft.com/azure/backup/back-up-azure-stack-hyperconverged-infrastructure-virtual-machines'
const SWITCHLESS_PATTERN:Record<number,string>={
 2:'https://learn.microsoft.com/azure/azure-local/plan/two-node-switchless-two-switches?view=azloc-2609',
 3:'https://learn.microsoft.com/azure/azure-local/plan/three-node-switchless-two-switches-two-links?view=azloc-2609',
 4:'https://learn.microsoft.com/azure/azure-local/plan/four-node-switchless-two-switches-two-links?view=azloc-2609',
}
const SWITCHLESS_SINGLE_3='https://learn.microsoft.com/azure/azure-local/plan/three-node-switchless-two-switches-single-link?view=azloc-2609'
export const SWITCHLESS_MAX_NODES=4
/** Direct node-to-node storage links in a switchless full mesh: N(N-1)/2 for single link, N(N-1) for dual link (2 nodes: 1 or 2; 3 nodes: 3 or 6; 4 nodes: 12). */
export const switchlessLinkCount=(nodes:number,links:unknown)=>nodes<2?0:nodes*(nodes-1)/2*(links==='single-link'?1:2)
export const RESERVED_AZURE_ASNS=[8074,8075,12076,65515,65517,65518,65519,65520]
export const releaseTrain=(release:unknown)=>Number(String(release).split('.')[0])||0
export function componentFindings(p:Project):Finding[]{
 const out:Finding[]=[]
 const add=(group:string,record:string,field:string,message:string,resolution:string,severity:Finding['severity']='error',category:Finding['category']='support',source?:string)=>out.push({id:`component:${group}:${record}:${field}:${out.length}`,severity,category,screen:((record?collections:settings).find(g=>g.key===group)??collections.find(g=>g.key===group))?.screen??13,group,record,field,message,resolution,source})
 const c=p.config,a=c.architecture,nodes=activeRecords(p,'nodes').length,s2d=S2D_STORAGE.includes(String(a.storage)),san=SAN_STORAGE.includes(String(a.storage))
 if(s2d&&a.switching==='switchless'){
  if(nodes>SWITCHLESS_MAX_NODES)add('architecture','','switching',`Switchless storage supports 1–4 machines; this design has ${nodes}.`,'Choose switched storage connectivity or reduce the node count. The limit is hard and switchless clusters do not scale out.','error','support',NETCONS)
  if(nodes>=3&&nodes<=SWITCHLESS_MAX_NODES&&a.route==='portal')add('architecture','','route','Three- and four-node switchless storage deploys only through ARM templates.','Choose the ARM or Terraform / Ansible route, or use switched storage.','error','support',NETCONS)
  if(nodes>=3&&a.route!=='portal'&&c.arm.enableStorageAutoIp===true)add('arm','','enableStorageAutoIp','Network ATC storage automatic IP is not supported for three- or four-node switchless storage.','Turn it off and record every per-node storage address.','error','support',NETCONS)
  if(nodes===4&&a.switchlessLinks==='single-link')add('architecture','','switchlessLinks','Four-node switchless storage is documented only as dual link.','Choose dual link.','error','support',NETCONS)
  if(nodes>=2&&nodes<=SWITCHLESS_MAX_NODES)storageLinkFindings(p,nodes,add)
 }
 if(c.tor.provider==='not-used'){
  if(s2d&&a.switching==='switched'&&nodes>1)add('tor','','provider','Switched storage needs top-of-rack switches.','Record the top-of-rack switches or choose switchless storage.','error','support',NETCONS)
  else add('tor','','provider','Azure Local still needs a physical switch for management and compute traffic, even with switchless storage.','Record who provides that switch.','review','support',NETCONS)
 }else if(s2d&&a.switching==='switched'&&c.tor.rdmaType==='RoCEv2'){
  const vlans=String(c.tor.storageVlans).split(/[\s,;]+/).filter(Boolean)
  if(!vlans.length||vlans.some(v=>!/^\d+$/.test(v)||Number(v)<1||Number(v)>4094))add('tor','','storageVlans','RoCE storage needs non-zero storage VLAN IDs so priority flow control can tag the traffic.','Enter VLAN IDs from 1 to 4094, for example 711,712.','error','input',ATC)
 }
 if(s2d)for(const net of activeRecords(p,'networks'))if(net.values.role==='s2d-storage'&&net.values.rdma==='roce'&&Number(net.values.vlan)===0)add('networks',net.id,'vlan','A RoCE storage network needs a non-zero VLAN.','Assign the storage VLAN, for example 711.','error','input',ATC)
 if(san){
  if(releaseTrain(a.release)<2604)add('architecture','','release','External SAN over Fibre Channel or iSCSI needs Azure Local 2604 or later.','Select release 2604 or later.','error','support',SANCONN)
  if(a.topology==='rack-aware')add('architecture','','topology','Rack-aware clusters do not support external SAN storage.','Use a standard topology, or S2D-only storage for a rack-aware cluster.','error','support',NETCONS)
  for(const fabric of activeRecords(p,'fabrics'))if(fabric.values.protocol!==a.sanProtocol)add('fabrics',fabric.id,'protocol',`This fabric uses ${fabric.values.protocol} but the design SAN protocol is ${a.sanProtocol}.`,'Match the fabric protocol to the SAN protocol decision.','error','input')
 }
 if(c.azure.witness==='unresolved')add('azure','','witness','The cluster witness is not decided yet, so infrastructure.yml records it as not in use and has no witness data.','Choose a cloud, file share or existing witness, or none.','review','input',QUORUM)
 if(c.azure.witness==='none'){
  if(nodes===2||a.topology==='rack-aware')add('azure','','witness','Two-node and rack-aware clusters require a cluster witness.','Choose a cloud witness.','error','support',QUORUM)
  else if(nodes>=3&&nodes<=4)add('azure','','witness','A witness is strongly recommended for three- and four-node clusters.','Choose a cloud or file share witness, or record why none is used.','review','support',QUORUM)
 }
 const h=c.hybrid,o=c.outbound
 if(h.s2sVpn==='unanswered')add('hybrid','','s2sVpn','Answer whether an Azure site-to-site VPN is used.','Choose used or not used for the site-to-site VPN.','error','input')
 if(o.egressModel==='private-path'){
  if(h.s2sVpn!=='used'&&h.expressRoute!=='used')add('outbound','','egressModel','Private path needs ExpressRoute or a site-to-site VPN to reach the Azure Firewall explicit proxy.','Mark ExpressRoute or the site-to-site VPN as used, or choose another outbound model.','error','support',PRIVPATH)
  if(releaseTrain(a.release)<2608)add('outbound','','egressModel','Private path needs Azure Local 2608 or later.','Select a supported release or another outbound model.','error','support',PRIVPATH)
 }
 if(h.s2sVpn==='used'&&h.bgpEnabled===true){
  const onPrem=Number(h.onPremAsn),azure=Number(h.azureAsn)
  if(h.vpnGatewaySku==='Basic')add('hybrid','','vpnGatewaySku','The Basic VPN gateway SKU does not support BGP.','Choose a VpnGw SKU or turn BGP off.','error','support',VPNBGP)
  if(onPrem&&onPrem===azure)add('hybrid','','onPremAsn','The on-premises ASN must differ from the Azure ASN.','Use a different private ASN.','error','input',VPNBGP)
  if(RESERVED_AZURE_ASNS.includes(onPrem))add('hybrid','','onPremAsn',`ASN ${onPrem} is reserved by Azure.`,'Choose another ASN.','error','input',VPNBGP)
  if(h.onPremBgpPeerIp&&h.onPremBgpPeerIp===h.onPremPublicIp)add('hybrid','','onPremBgpPeerIp','The BGP peer address must not be the VPN device public IP.','Use a separate peer address, such as an APIPA address.','error','input',VPNBGP)
 }
 if(h.p2sVpn==='used'){
  if(h.p2sAuth==='entra-id'&&!String(h.p2sTunnel).includes('OpenVPN'))add('hybrid','','p2sAuth','Microsoft Entra ID authentication works only with the OpenVPN tunnel type.','Choose a tunnel type that includes OpenVPN, or another authentication method.','error','support',P2S)
  if(h.s2sVpn==='used'&&h.vpnGatewaySku==='Basic'&&(String(h.p2sTunnel).includes('IKEv2')||h.p2sAuth==='radius'))add('hybrid','','p2sTunnel','The Basic SKU supports neither IKEv2 nor RADIUS for point-to-site.','Choose a VpnGw SKU.','error','support',P2S)
 }
 if(h.expressRoute==='used'){const peer=Number(h.erPeerAsn);if(peer>=65515&&peer<=65520)add('hybrid','','erPeerAsn','ASNs 65515–65520 are reserved by Microsoft.','Choose another peer ASN.','error','input',ERPEER)}
 if(c.firewall.provider==='customer'&&c.firewall.httpsInspectionDisabled!==true)add('firewall','','httpsInspectionDisabled','HTTPS inspection is not supported anywhere on the Azure Local outbound path.','Confirm the customer firewall exempts Azure Local traffic from HTTPS inspection.','review','support',FW)
 if(c.backup.solution==='mabs'&&a.identity==='local'&&c.backup.mabsAuth!=='certificate')add('backup','','mabsAuth','A local-identity cluster needs certificate authentication for MABS agents.','Choose certificate authentication.','error','support',MABS)
 return out
}
type Add=(group:string,record:string,field:string,message:string,resolution:string,severity?:Finding['severity'],category?:Finding['category'],source?:string)=>void
/** Switchless cable map: link count per Microsoft pattern, full-mesh pair coverage, no self links, each storage port used once, port on the named node. */
function storageLinkFindings(p:Project,nodes:number,add:Add){
 const mode=p.config.architecture.switchlessLinks,single=mode==='single-link'
 if(nodes===4&&single)return // already an error: four-node switchless is dual link only
 const expected=switchlessLinkCount(nodes,mode),perPair=single?1:2,pattern=`${nodes}-node ${single?'single':'dual'}-link`
 const source=nodes===3&&single?SWITCHLESS_SINGLE_3:SWITCHLESS_PATTERN[nodes]
 const links=activeRecords(p,'storageLinks'),nodeIds=new Set(activeRecords(p,'nodes').map(n=>n.id)),adapters=new Map(p.records.adapters.map(x=>[x.id,x]))
 if(!links.length){add('storageLinks','','name',`The switchless cable map is empty. ${pattern} switchless storage needs ${expected} direct node-to-node links.`,'Record each direct storage cable with the port on both nodes.','review','input',source);return}
 if(links.length!==expected)add('storageLinks','','name',`${pattern} switchless storage needs ${expected} direct node-to-node links; ${links.length} are recorded.`,`Record exactly ${expected} links: ${perPair} between every pair of nodes.`,'error','support',source)
 const pairs=new Map<string,number>(),ports=new Map<string,string>()
 for(const link of links){
  const v=link.values,label=String(v.name||link.id)
  if(v.nodeA&&v.nodeA===v.nodeB)add('storageLinks',link.id,'nodeB',`Link ${label} connects a node to itself.`,'Choose a different node for node B.','error','input',source)
  else if(nodeIds.has(String(v.nodeA))&&nodeIds.has(String(v.nodeB))){const key=[String(v.nodeA),String(v.nodeB)].sort().join('|');pairs.set(key,(pairs.get(key)??0)+1)}
  for(const [portField,nodeField] of [['portA','nodeA'],['portB','nodeB']] as const){
   const port=String(v[portField]??'');if(!port)continue
   const adapter=adapters.get(port)
   if(adapter&&v[nodeField]&&adapter.values.node!==v[nodeField])add('storageLinks',link.id,portField,`Link ${label}: the ${portField==='portA'?'node A':'node B'} storage port belongs to a different node.`,'Choose a port recorded on that node.','error','input')
   if(ports.has(port))add('storageLinks',link.id,portField,`Link ${label} reuses a storage port already used by link ${ports.get(port)}.`,'Each storage port carries one direct link. Choose an unused port.','error','input',source)
   else ports.set(port,label)
  }
 }
 const ids=[...nodeIds].sort()
 if(links.length===expected)for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const count=pairs.get(`${ids[i]}|${ids[j]}`)??0;if(count!==perPair){add('storageLinks','','nodeA',`Every pair of nodes needs ${perPair} direct link${perPair>1?'s':''} in a ${pattern} full mesh; at least one pair has ${count}.`,'Connect every node directly to every other node.','error','support',source);return}}
}
