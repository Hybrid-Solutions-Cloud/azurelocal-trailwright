import { canonical, parseProject, type Project } from './project'
export const DRAFT_KEY='azurelocal-configurator:draft:v2'
export const HISTORY_KEY='azurelocal-configurator:revisions:v2'
export type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>
export function browserStorage():Store|null {try {const store=window.localStorage;store.getItem(DRAFT_KEY);return store}catch{return null}}
export function unavailableStore():Store {return {getItem:()=>null,setItem:()=>{throw new Error('Browser storage unavailable. Download your project to preserve changes.')},removeItem:()=>{throw new Error('Browser storage unavailable.')}}}
export interface Draft { project:Project|null; error:string; corrupt:string|null }
export function restore(storage:Store):Draft {const raw=storage.getItem(DRAFT_KEY);if(!raw)return {project:null,error:'',corrupt:null};try{return {project:parseProject(raw),error:'',corrupt:null}}catch(e){return {project:null,error:`Saved draft could not be opened: ${(e as Error).message}. Download the original draft before replacing it.`,corrupt:raw}}}
/** Compare-and-write: another tab's revision is never overwritten silently. */
export function autosave(storage:Store,p:Project,expected:string|null):string {const current=storage.getItem(DRAFT_KEY);if(current!==expected)throw new Error('Another tab changed the saved draft. Review that revision before saving.');const raw=canonical(parseProject(canonical(p)));storage.setItem(DRAFT_KEY,raw);return raw}
export function snapshots(storage:Store):Project[]{try{const raw=storage.getItem(HISTORY_KEY);const items:unknown=raw?JSON.parse(raw):[];if(!Array.isArray(items)||items.length>10)return [];return items.map(x=>parseProject(JSON.stringify(x)))}catch{return []}}
export function checkpoint(storage:Store,p:Project){const list=snapshots(storage).filter(x=>!(x.id===p.id&&x.revision===p.revision));storage.setItem(HISTORY_KEY,JSON.stringify([p,...list].slice(0,10)))}
