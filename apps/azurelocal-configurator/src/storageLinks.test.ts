import {describe,it,expect} from 'vitest'
import {armFixture} from './testing/armFixture'
import {activeBranch,collections} from './catalog'
import {canonical,newRecord,parseProject,type Project} from './project'
import {assess} from './assessment'
import {masterInfrastructure} from './masterInfrastructure'
type Links={networking:{onprem:{storage_connectivity?:{node_to_node_links?:unknown[]}}}}
const linkErrors=(p:Project)=>assess(p).filter(f=>f.group==='storageLinks'&&f.severity==='error').map(f=>f.message)
const links=(p:Project)=>(masterInfrastructure(p) as unknown as Links).networking.onprem.storage_connectivity?.node_to_node_links
function switchless(){
 const p=armFixture();p.config.architecture.switching='switchless';p.config.architecture.switchlessLinks='dual-link'
 const [n1,n2]=p.records.nodes,port=(node:string,i:number)=>p.records.adapters.filter(a=>a.values.node===node)[i].id
 for(let i=0;i<2;i++){const r=newRecord('storageLinks');Object.assign(r.values,{name:`Link ${i+1}`,linkIndex:i+1,nodeA:n1.id,portA:port(n1.id,i),nodeB:n2.id,portB:port(n2.id,i),subnet:`10.71.${i+1}.0/24`,vlan:711+i});p.records.storageLinks.push(r)}
 return p
}
describe('switchless storage cable map',()=>{
 it('accepts a complete two-node dual-link map and exports every cable',()=>{
  const p=switchless()
  expect(linkErrors(p)).toEqual([])
  expect(links(p)).toHaveLength(2)
  expect(links(p)![0]).toMatchObject({link_index:1,node_a:'node1',node_b:'node2',vlan:711})
 })
 it('rejects a missing link, a self link and a reused port',()=>{
  const missing=switchless();missing.records.storageLinks.pop()
  expect(linkErrors(missing).some(m=>m.includes('needs 2 direct node-to-node links'))).toBe(true)
  const self=switchless();self.records.storageLinks[1].values.nodeB=self.records.storageLinks[1].values.nodeA
  expect(linkErrors(self).some(m=>m.includes('connects a node to itself'))).toBe(true)
  const reused=switchless();reused.records.storageLinks[1].values.portA=reused.records.storageLinks[0].values.portA
  expect(linkErrors(reused).some(m=>m.includes('reuses a storage port'))).toBe(true)
 })
 it('hides the map for switched storage, keeps the cables and leaves them out of infrastructure.yml',()=>{
  const p=switchless();p.config.architecture.switching='switched'
  const reopened=parseProject(canonical(p))
  expect(activeBranch(collections.find(g=>g.key==='storageLinks')!.branch,reopened.config)).toBe(false)
  expect(reopened.records.storageLinks).toHaveLength(2)
  expect(links(reopened)).toBeUndefined()
  expect(linkErrors(reopened)).toEqual([])
 })
})
