import type { Project } from './project'

/** Source receipts remain estimates/observations. Exporting them never verifies runtime state. */
export function provenanceExport(p: Project) {
 return {kind:'azurelocal-import-provenance',projectId:p.id,revision:p.revision,runtimeQualified:false,receipts:p.provenance.map(receipt=>{
  let snapshot:unknown=receipt.original
  try { snapshot=JSON.parse(receipt.original) } catch { /* Older receipts retain original plain text. */ }
  const {original,...metadata}=receipt
  return {...metadata,sourceSnapshot:snapshot}
 })}
}

export function provenanceSchedules(p: Project): Record<string,unknown[][]> {
 const receipts:unknown[][]=[['Receipt ID','Source','Version','Schema','Source SHA-256','Generated at','Imported at','Group','Target record IDs','Evidence class']]
 const mappings:unknown[][]=[['Receipt ID','Group','Source record ID','Target record ID','Collection','Decision']]
 for(const receipt of p.provenance){
  receipts.push([receipt.id,receipt.source,receipt.version,receipt.schema,receipt.sha256,receipt.generatedAt,receipt.importedAt,receipt.group,receipt.recordIds.join(', '),'Imported sizing; runtime unverified'])
  try {
   const parsed=JSON.parse(receipt.original)
   if(Array.isArray(parsed?.sourceRecordMappings))for(const mapping of parsed.sourceRecordMappings){
    if(mapping&&typeof mapping==='object')mappings.push([receipt.id,receipt.group,mapping.sourceId??'',mapping.targetId??'',mapping.collection??'configuration',mapping.decision??mapping.configuration??''])
   }
  }catch { /* No structured mapping in earlier source receipts. */ }
 }
 return {Provenance:receipts,'Source mappings':mappings}
}
