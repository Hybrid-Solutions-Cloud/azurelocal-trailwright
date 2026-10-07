import {it,expect} from 'vitest'
import {newProject,newRecord} from './project'
import {assess} from './assessment'
import {SUPPORT_CATALOG} from './support'
it('keeps conflicting and unsupported support separate from documented conditional paths',()=>{
 expect(SUPPORT_CATALOG.entries.find(e=>e.id==='local-identity')!.status).toBe('documentation-conflict')
 expect(SUPPORT_CATALOG.entries.find(e=>e.id==='local-wac')!.status).toBe('unsupported')
 expect(SUPPORT_CATALOG.entries.find(e=>e.id==='hybrid-iscsi')!.status).toBe('documented-conditional')
 expect(SUPPORT_CATALOG.sourceLock.sources).toHaveLength(12)
 for(const source of SUPPORT_CATALOG.sourceLock.sources){expect(source.commit).toMatch(/^[a-f0-9]{40}$/);expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);expect(source.immutableUrl).toContain(source.commit)}
})
it('reviews mismatched builds without overwriting intent or accepting known issues as remediated',()=>{
 const p=newProject();p.config.architecture.solutionVersion='12.2604.1003.1006';p.config.architecture.osBuild='26100.1'
 expect(assess(p).some(f=>f.message.includes('solution/OS pair'))).toBe(true)
 expect(p.config.architecture.osBuild).toBe('26100.1')
 p.config.architecture.osBuild='26100.32690'
 expect(assess(p).some(f=>f.message.includes('solution/OS pair'))).toBe(false)
 expect(assess(p).some(f=>f.message.includes('known-issues review'))).toBe(true)
})
it('raises local-identity WAC compatibility without prohibiting independently hosted AD services',()=>{
 const p=newProject();p.config.architecture.identity='local';const wac=newRecord('management'),ad=newRecord('management');wac.values.product='wac';ad.values.product='ad-dns';p.records.management=[wac,ad]
 const finding=assess(p).find(f=>f.record===wac.id&&f.message.includes('WAC cannot'))!
 expect(finding.category).toBe('support');expect(finding.resolution).toContain('separate compatible estate')
 expect(assess(p).some(f=>f.record===ad.id&&f.category==='support')).toBe(false)
 p.config.architecture.identity='ad';expect(assess(p).some(f=>f.message.includes('WAC cannot'))).toBe(false)
})
