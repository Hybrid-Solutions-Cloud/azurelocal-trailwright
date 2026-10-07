import {describe,it,expect} from 'vitest'
import {armFixture} from './testing/armFixture'
import {exportFiles,zip} from './exports'
const text=(v:string|Uint8Array)=>typeof v==='string'?v:Buffer.from(v).toString('base64')
describe('export determinism',()=>{
 it('produces identical package files and archive bytes for the same project',async()=>{
  const p=armFixture()
  const first=await exportFiles(p,false,false),second=await exportFiles(p,false,false)
  expect(Object.keys(second).sort()).toEqual(Object.keys(first).sort())
  for(const path of Object.keys(first))expect(text(second[path]),path).toBe(text(first[path]))
  expect(Buffer.from(zip(second,p.updatedAt)).equals(Buffer.from(zip(first,p.updatedAt)))).toBe(true)
 })
})
