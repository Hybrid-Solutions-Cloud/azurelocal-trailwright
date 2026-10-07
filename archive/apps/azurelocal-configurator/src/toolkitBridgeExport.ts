import sourceSchema from './contracts/toolkit/infrastructure.schema.json?raw'
import toolkitLock from './contracts/toolkit/source-lock.json'
import armLock from './contracts/arm/source-lock.json'
import {toolkitBridgeInputs,bridgeMapping,bridgeParameterSchema,bridgeCompanionSchema,TOOLKIT_BRIDGE_VERSION} from './toolkitBridge'
import {canonical,type Project} from './project'
/** Conversion data and a finished ARM parameter file. No converter script, template or deployment code is emitted. */
export async function toolkitConversionFiles(p:Project):Promise<Record<string,string>>{
 const input=await toolkitBridgeInputs(p),files:Record<string,string>={'plans/toolkit-conversion-review.json':canonical(input.review)}
 if(!input.files)return files
 const identity=input.review.identity,prefix='toolkit/conversion/'
 files[prefix+'infrastructure.yml']=input.files['infrastructure.yml'];files[prefix+'companion.json']=input.files['companion.json']
 files[prefix+'contracts/toolkit/infrastructure.schema.json']=sourceSchema
 files[prefix+'contracts/toolkit/source-lock.json']=canonical(toolkitLock)
 files[prefix+'contracts/arm/source-lock.json']=canonical(armLock)
 files[prefix+`contracts/toolkit/bridge/${identity}.mapping.json`]=canonical({version:TOOLKIT_BRIDGE_VERSION,identity,pointers:bridgeMapping(identity)})
 files[prefix+`contracts/toolkit/bridge/${identity}.parameters.schema.json`]=canonical(bridgeParameterSchema(identity))
 files[prefix+`contracts/toolkit/bridge/${identity}.companion.schema.json`]=canonical(bridgeCompanionSchema(identity))
 files[prefix+'README.md']=`# Toolkit conversion data\n\nCanonical Toolkit source: ${toolkitLock.commit}. Identity: ${identity}. ${input.review.boundary}\n\ninfrastructure.yml is the canonical Toolkit hierarchy for this design. companion.json carries the values the Toolkit hierarchy cannot express, bound to that YAML by SHA-256. The finished ARM parameter file is at inputs/arm/azuredeploy.parameters.json; secure values in it are Key Vault references. The contracts folder holds the schemas and source pins these files were validated against.\n\nKeep infrastructure.yml and companion.json together and regenerate them through reviewed project changes. These files are not a deployment authorization.\n`
 return files
}
