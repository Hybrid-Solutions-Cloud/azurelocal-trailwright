import {collections} from './catalog'
import {activeRecords} from './selectors'
import {canonical,MAX_RECORDS,newRecord,parseProject,revise,type InventoryRecord,type Project} from './project'

export interface CsvCountPreview {snapshot:string;source:'s2d'|'san';count:number;added:InventoryRecord[];removed:InventoryRecord[];references:{group:string;record:string;field:string;name:string;target:string}[]}
export function previewCsvCount(p:Project,source:'s2d'|'san',count:number):CsvCountPreview {
 if(!Number.isInteger(count)||count<0||count>MAX_RECORDS)throw new Error(`CSV count must be an integer from 0 to ${MAX_RECORDS}.`)
 const current=activeRecords(p,'volumes').filter(r=>r.values.role==='workload'&&r.values.source===source)
 const removed=current.slice(count),ids=new Set(removed.map(r=>r.id)),added:InventoryRecord[]=[]
 if(Object.values(p.records).reduce((sum,rows)=>sum+rows.length,0)+Math.max(0,count-current.length)-removed.length>MAX_RECORDS)throw new Error('CSV count would exceed the project inventory limit.')
 const names=new Set(p.records.volumes.map(r=>String(r.values.name).toLowerCase()))
 let suffix=1
 for(let i=current.length;i<count;i++){
  while(names.has(`${source}-workload-${suffix}`))suffix++
  const row=newRecord('volumes');row.values.name=`${source}-workload-${suffix++}`;names.add(String(row.values.name));row.values.source=source
  row.values.provisioning='fixed';row.values.filesystem=source==='san'?'NTFS':'ReFS'
  added.push(row)
 }
 const references=collections.flatMap(g=>p.records[g.key].flatMap(r=>g.fields.filter(f=>f.type==='reference'&&ids.has(String(r.values[f.key]))).map(f=>({group:g.key,record:r.id,field:f.key,name:String(r.values.name||r.id),target:String(r.values[f.key])}))))
 return {snapshot:canonical(p),source,count,added,removed,references}
}
export function applyCsvCount(p:Project,preview:CsvCountPreview):Project {
 if(canonical(p)!==preview.snapshot)throw new Error('The design changed after this preview. Review the CSV count again.')
 const next=structuredClone(p),removed=new Set(preview.removed.map(r=>r.id))
 next.records.volumes=next.records.volumes.filter(r=>!removed.has(r.id)).concat(structuredClone(preview.added))
 return parseProject(canonical(revise(next)))
}
