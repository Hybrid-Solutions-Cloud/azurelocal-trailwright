import {activeBranch,collections} from './catalog'
import type {InventoryRecord,Project} from './project'
export const activeRecord=(r:InventoryRecord)=>r.values.lifecycle!=='not-required'
export function activeRecords(p:Project,key:string){const g=collections.find(g=>g.key===key);return g&&activeBranch(g.branch,p.config)?p.records[key].filter(activeRecord):[]}
export const number=(v:unknown)=>typeof v==='number'?v:0
export const bytes=(size:unknown,unit:unknown)=>number(size)*({GB:1e9,GiB:2**30,TB:1e12,TiB:2**40}[String(unit)]??0)
