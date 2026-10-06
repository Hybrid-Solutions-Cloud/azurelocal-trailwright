import {describe,it,expect} from 'vitest'
import {armFixture} from './testing/armFixture'
import {sanitize} from './project'
import {armInputFiles,armInputReview,ARM_PARAMETERS_PATH} from './armInputExport'
import {mapArm} from './armMapping'
import {exportFiles} from './exports'
import {templates,validateArmParameters} from './armContract'
describe('ARM parameter file data',()=>{
 it.each(['arm','terraform-ansible'] as const)('exports the finished parameter file for the %s route without Toolkit conversion',async route=>{
  for(const identity of ['ad','local'] as const){
   const p=armFixture(identity);p.config.architecture.route=route;p.config.toolkit.enabled=false
   const review=armInputReview(p);expect(review.reasons).toEqual([]);expect(review.available).toBe(true)
   const files=await exportFiles(p,false,false),document=JSON.parse(String(files[ARM_PARAMETERS_PATH]))
   expect(document).toEqual(JSON.parse(JSON.stringify(mapArm(p).document)));expect(validateArmParameters(templates[identity],document)).toEqual([])
  }
 })
 it('withholds the file for the portal route, sanitized designs and unqualified storage branches',async()=>{
  const portal=armFixture();portal.config.architecture.route='portal';portal.config.toolkit.enabled=false
  expect(armInputFiles(portal)).toEqual({});expect((await exportFiles(portal,false,false))[ARM_PARAMETERS_PATH]).toBeUndefined()
  const shared=armFixture();shared.config.architecture.route='arm';expect(armInputFiles(sanitize(shared))).toEqual({})
  for(const [key,value]of [['storage','san'],['storage','hybrid'],['topology','rack-aware'],['intent','reuse']]){
   const p=armFixture();p.config.architecture.route='arm';p.config.architecture[key]=value
   expect(armInputReview(p).available,`${key}=${value}`).toBe(false);expect((await exportFiles(p,false,false))[ARM_PARAMETERS_PATH]).toBeUndefined()
  }
 })
})
