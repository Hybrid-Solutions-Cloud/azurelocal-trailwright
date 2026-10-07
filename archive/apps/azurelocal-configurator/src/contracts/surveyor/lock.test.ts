import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import lock from './source-lock.json'
import evidence from '../../testing/surveyor/evidence.json'
import runtimeLock from './runtime280/source-lock.json'
import liveEvidence from '../../testing/surveyor/live-evidence.json'
const hash=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex')
it('retains immutable source pins and verifies generated schemas and captured fixture bytes',()=>{
 for(const contract of lock.contracts){
  expect(contract.commit).toMatch(/^[a-f0-9]{40}$/)
  expect(hash(readFileSync(new URL(`./${contract.version}.schema.json`,import.meta.url)))).toBe(contract.schemaSha256)
  if('projectSchemaSha256' in contract)expect(hash(readFileSync(new URL(`./${contract.version}.project.schema.json`,import.meta.url)))).toBe(contract.projectSchemaSha256)
  const fixture=evidence.fixtures.find(f=>f.version===contract.version)!
  expect(hash(readFileSync(new URL(`../../testing/surveyor/${contract.version}.json`,import.meta.url)))).toBe(fixture.fixtureSha256)
  expect(fixture.sources.some(s=>s.path==='src/exporters/json.ts')).toBe(true)
  for(const source of contract.sources)expect(source.sha256).toMatch(/^[a-f0-9]{64}$/)
 }
})
it('verifies pinned sizing runtime bytes and its explicit local-only boundaries',()=>{
 expect(hash(readFileSync(new URL(`../../testing/surveyor/${liveEvidence.fixture}`,import.meta.url)))).toBe(liveEvidence.fixtureSha256)
 for(const source of runtimeLock.sources){const localPath=source.path.replace(/^src\//,'');const adaptation=runtimeLock.localBoundaries.find(s=>s.path===localPath);expect(hash(readFileSync(new URL(`./runtime280/${localPath}`,import.meta.url)))).toBe(adaptation?.sha256??source.sha256)}
 for(const boundary of runtimeLock.localBoundaries)expect(hash(readFileSync(new URL(`./runtime280/${boundary.path}`,import.meta.url)))).toBe(boundary.sha256)
 const state=readFileSync(new URL('./runtime280/state/store.ts',import.meta.url),'utf8');expect(state).not.toContain('localStorage');expect(state).not.toContain('zustand')
 expect(readFileSync(new URL('./runtime280/LICENSE',import.meta.url),'utf8')).toContain('MIT License')
})
