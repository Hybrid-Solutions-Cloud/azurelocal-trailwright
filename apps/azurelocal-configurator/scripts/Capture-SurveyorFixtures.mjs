// Runs the pinned source exporter in an isolated JS context with synthetic inputs.
// This is fixture generation, not a production build or infrastructure test.
import ts from 'typescript'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import vm from 'node:vm'
import {createHash} from 'node:crypto'
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..'),destination=resolve(app,'src/testing/surveyor')
mkdirSync(destination,{recursive:true})
const input={
 hardware:{nodeCount:4,capacityDrivesPerNode:6,capacityDriveSizeTB:3.84,cacheDrivesPerNode:2,cacheDriveSizeTB:1.6,cacheMediaType:'nvme',capacityMediaType:'ssd',coresPerNode:32,memoryPerNodeGB:256,hyperthreadingEnabled:true},
 advanced:{infraVolumeSizeTB:.25,vCpuOversubscriptionRatio:4,systemReservedMemoryGB:8,systemReservedVCpus:4,defaultResiliency:'three-way-mirror',overrides:{},maintenanceReserveMode:'n+1'},
 volumes:[{id:'volume-1',name:'Workload CSV sizing',resiliency:'three-way-mirror',provisioning:'fixed',plannedSizeTB:4}],volumeMode:'workload',
 avdEnabled:true,avd:{pools:[{id:'pool-1',name:'Desktop pool',totalUsers:32,concurrentUsers:16,workloadType:'medium',multiSession:true,fslogixEnabled:true,profileSizeGB:40,officeContainerEnabled:true,officeContainerSizeGB:10,dataDiskPerHostGB:20,profileStorageLocation:'sofs'}],userTypeMixEnabled:false,userTypeMix:{taskPct:30,taskProfileGB:15,knowledgePct:50,knowledgeProfileGB:40,powerPct:20,powerProfileGB:80},growthBufferPct:20},
 sofsEnabled:true,sofs:{userCount:32,concurrentUsers:16,profileSizeGB:60,redirectedFolderSizeGB:10,containerType:'split',sofsGuestVmCount:2,sofsVCpusPerVm:4,sofsMemoryPerVmGB:16,internalMirror:'three-way',autoSizeDrivesPerNode:4,autoSizeNodes:2,volumeLayout:'shared',sofsOsDiskPerVmGB:127},
 mabsEnabled:true,mabs:{protectedDataTB:10,dailyChangeRatePct:10,onPremRetentionDays:14,scratchCachePct:15,mabsVCpus:8,mabsMemoryGB:32,mabsOsDiskGB:200,internalMirror:'two-way',mabsOsDiskPlacement:'dedicated'},
 aks:{enabled:true,clusters:[{id:'aks-1',name:'Application cluster',controlPlaneNodesPerCluster:3,workerNodesPerCluster:4,vCpusPerWorker:8,memoryPerWorkerGB:32,osDiskPerNodeGB:200,persistentVolumesTB:2}]},
 virtualMachines:{enabled:true,vCpuOvercommitRatio:2,groups:[{id:'vm-1',name:'Business VMs',vmCount:5,vCpusPerVm:4,memoryPerVmGB:16,storagePerVmGB:200}]},
 servicePresets:[{id:'service-1',catalogId:'arc-sql-mi-gp',enabled:true,instanceCount:1}],
 customWorkloads:[{id:'custom-1',name:'Reporting service',description:'Synthetic sizing fixture',enabled:true,vmCount:2,vCpusPerVm:4,memoryPerVmGB:16,osDiskPerVmGB:127,storageTB:.5,internalMirrorFactor:2,bandwidthMbps:100}],
}
const hashes=[],fixed='2026-09-11T12:00:00.000Z'
for(const [version,root]of [['2.7.0',resolve(app,'../azurelocal-surveyor')],['2.8.0',process.argv[2]||'D:/tmp/azurelocal-surveyor-contract-2.8.0']]){
 const loaded=new Map(),sourceHashes=[];let blob
 const context=vm.createContext({console,Math,JSON,Blob,URL:{createObjectURL(value){blob=value;return 'blob:fixture'},revokeObjectURL(){}},document:{createElement(){return {click(){}}}},Date:class extends Date{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return Date.parse(fixed)}}})
 function load(path){let file=path;if(!existsSync(file))file+='.ts';if(file.endsWith('.json'))return JSON.parse(readFileSync(file,'utf8'));if(loaded.has(file))return loaded.get(file).exports;const source=readFileSync(file,'utf8'),module={exports:{}};loaded.set(file,module);sourceHashes.push({path:relative(root,file).replaceAll('\\','/'),sha256:createHash('sha256').update(source).digest('hex')});const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const fn=vm.runInContext(`(function(require,module,exports){${code}\n})`,context,{filename:file});fn(name=>{if(!name.startsWith('.'))throw Error('Unexpected external runtime dependency '+name);return load(resolve(dirname(file),name))},module,module.exports);return module.exports}
 const exporter=load(resolve(root,'src/exporters/json.ts')),state=structuredClone(input)
 if(version==='2.8.0'){state.inventory=[{id:'inventory-1',name:'Measured VM',tier:'database',include:true,vCpu:8,memoryGiB:32,consumedGiB:120,provisionedGiB:200,powerState:'on',sourceCluster:'source-cluster',sourceHost:'source-host',guestOs:'Windows Server',reviewed:true,measurement:{cpuP95Pct:50,memoryP95Pct:75,iopsP95:100,throughputMBpsP95:20,observationDays:14}}];state.inventorySettings={sizingBasis:'measured-p95',storageBasis:'consumed',comfortFactor:1.25,growthPct:10};state.inventorySources=[{kind:'rvtools',fileName:'synthetic.xlsx',importedAt:fixed,rows:1}]}
 exporter.exportJson(state)
 const text=await blob.text(),path=resolve(destination,`${version}.json`);writeFileSync(path,text+'\n')
 hashes.push({version,fixtureSha256:createHash('sha256').update(text+'\n').digest('hex'),method:'Actual pinned source exportJson with synthetic state; browser download sink captured in isolated JS context; no runtime infrastructure qualification',sources:sourceHashes.sort((a,b)=>a.path.localeCompare(b.path))})
 console.log(`Captured actual Surveyor ${version} exporter fixture`)
}
writeFileSync(resolve(destination,'evidence.json'),JSON.stringify({generatedAt:fixed,fixtures:hashes},null,2)+'\n')
