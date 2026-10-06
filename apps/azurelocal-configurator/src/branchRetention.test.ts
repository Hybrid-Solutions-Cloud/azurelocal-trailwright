import {describe,it,expect} from 'vitest'
import {armFixture} from './testing/armFixture'
import {canonical,newRecord,parseProject,type Project} from './project'
import {activeRecords} from './selectors'
import {armInputFiles,ARM_PARAMETERS_PATH} from './armInputExport'
import {exportFiles} from './exports'
const reopen=(p:Project)=>parseProject(canonical(p))
describe('storage branch switches keep hidden answers and export only the active branch',()=>{
 it('S2D to SAN and back survives save and reopen without leaking inactive records into input data',async()=>{
  const p=armFixture();p.config.toolkit.enabled=false
  const fabric=newRecord('fabrics');Object.assign(fabric.values,{name:'Retained SAN fabric',protocol:'iscsi'});p.records.fabrics.push(fabric)
  const s2dFiles=armInputFiles(p),storageNetworks=structuredClone(p.records.armStorageNetworks),storageAddresses=structuredClone(p.records.storageAddresses)
  expect(s2dFiles[ARM_PARAMETERS_PATH]).toBeDefined();expect(s2dFiles[ARM_PARAMETERS_PATH]).not.toContain('Retained SAN fabric')
  expect(activeRecords(p,'fabrics')).toEqual([])

  p.config.architecture.storage='san'
  const san=reopen(p)
  expect(san.records.armStorageNetworks).toEqual(storageNetworks);expect(san.records.storageAddresses).toEqual(storageAddresses)
  expect(activeRecords(san,'storageAddresses')).toEqual([]);expect(activeRecords(san,'fabrics').map(r=>r.id)).toEqual([fabric.id])
  const sanFiles=await exportFiles(san,false,false)
  expect(Object.keys(sanFiles).filter(path=>path.startsWith('inputs/'))).toEqual([])

  san.config.architecture.storage='s2d'
  const back=reopen(san)
  expect(back.records.fabrics.map(r=>r.values.name)).toEqual(['Retained SAN fabric'])
  expect(armInputFiles(back)).toEqual(s2dFiles)
 })
})
