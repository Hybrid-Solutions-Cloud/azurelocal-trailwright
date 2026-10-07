import {describe,it,expect} from 'vitest'
import {newProject} from './project'
import {assess} from './assessment'
import {masterInfrastructure} from './masterInfrastructure'
type Decision={gate:string;answer:unknown;in_use:boolean}
const s2sFinding=(p:ReturnType<typeof newProject>)=>assess(p).filter(f=>f.group==='hybrid'&&f.field==='s2sVpn'&&f.severity==='error')
describe('site-to-site VPN decision',()=>{
 it('starts unanswered and must be answered before the design is complete',()=>{
  const p=newProject()
  expect(p.config.hybrid.s2sVpn).toBe('unanswered')
  expect(s2sFinding(p)).toHaveLength(1)
  const decision=(masterInfrastructure(p) as unknown as {decisions:Decision[]}).decisions.find(d=>d.gate.includes('s2sVpn'))
  expect(decision?.in_use).toBe(false)
  p.config.hybrid.s2sVpn='not-used'
  expect(s2sFinding(p)).toEqual([])
  p.config.hybrid.s2sVpn='used'
  expect(s2sFinding(p)).toEqual([])
 })
})
