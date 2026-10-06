import type {Project} from './project'
import {collections} from './catalog'
import {activeRecord} from './selectors'
import type {DiagramPage} from './exports'
/** Every typed edge gets a local endpoint, including references into another page. */
export function diagramPages(p:Project):DiagramPage[]{
 const groups=[['Physical','sites','nodes','adapters','networks','intents'],['Network devices','firewalls','torSwitches','nicLinks','firewallLinks','bmcLinks','consolePorts'],['Storage','pools','devices','arrays','fabrics','initiators','targets','luns','ioPaths','volumes','storagePaths'],['Logical','logicalNetworks','nsgs','rules','workloads'],['Dependencies','managementHosts','management','managementBindings','bootstrapTasks','stages','dependencies']]
 const all=new Map(collections.flatMap(g=>p.records[g.key].map(row=>[row.id,{group:g.key,row}] as const)))
 return groups.flatMap(([name,...keys])=>{const records=keys.flatMap(group=>p.records[group].map(row=>({group,row})));const chunks=Array.from({length:Math.max(1,Math.ceil(records.length/12))},(_,i)=>records.slice(i*12,(i+1)*12));return chunks.map((chunk,index)=>{
  const members=new Map(chunk.map(x=>[x.row.id,x])),primary=new Set(members.keys()),edges:DiagramPage['edges']=[]
  for(const {group,row} of chunk)for(const f of collections.find(g=>g.key===group)!.fields.filter(f=>f.type==='reference')){const target=String(row.values[f.key]);if(!target)continue;const linked=all.get(target);if(linked){members.set(target,linked);edges.push({from:row.id,to:target,label:f.label})}}
  const nodes=[...members.values()].map(({group,row},i)=>{const detail=['managementIp','cidr','mount','directory','stableId'].map(k=>row.values[k]).find(Boolean)||('size'in row.values?`${row.values.size} ${row.values.unit}`:'');return {id:row.id,group,label:`${primary.has(row.id)?'':'Reference: '}${group}${activeRecord(row)?'':' (inactive)'}\n${String(row.values.name||row.id).slice(0,70)}${detail?'\n'+String(detail).slice(0,55):''}`,x:30+(i%3)*310,y:90+Math.floor(i/3)*125}})
  return {name:chunks.length===1?name:`${name} ${index+1}`,nodes,edges,width:980,height:Math.max(340,140+Math.ceil(nodes.length/3)*125)}
 })})
}
