// Native Node/TypeScript introspection only; does not build either application.
import ts from 'typescript'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const roots=[['2.7.0',resolve(app,'../azurelocal-surveyor'),'ce881af2f027520ab594cde7ac010b26b533600f'],['2.8.0',process.argv[2]||'D:/tmp/azurelocal-surveyor-contract-2.8.0','beff565dd0cd6edab36c76efc0bec7ccb25232f6']]
const output=resolve(app,'src/contracts/surveyor');mkdirSync(output,{recursive:true})
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
const locks=[]
const types=[]
function typeText(s){if('const' in s)return JSON.stringify(s.const);if(s.anyOf)return '('+s.anyOf.map(typeText).join(' | ')+')';if(s.type==='array')return `Array<${typeText(s.items)}>`;if(s.type==='object')return '{'+Object.entries(s.properties).map(([k,v])=>`${JSON.stringify(k)}${s.required.includes(k)?'':'?'}: ${typeText(v)}`).join('; ')+'}';return s.type}
for(const [version,root,commit]of roots){
 const file=resolve(root,'src/exporters/json.ts')
 const program=ts.createProgram([file,...(version==='2.8.0'?[resolve(root,'src/state/project.ts')]:[])],{strict:true,target:ts.ScriptTarget.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,module:ts.ModuleKind.ESNext,skipLibCheck:true,resolveJsonModule:true})
 const checker=program.getTypeChecker(),source=program.getSourceFile(file)
 const decl=source.statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='SurveyorPlan')
 const convert=(type,path,depth=0)=>{
  if(depth>30)throw Error('Recursive schema '+path)
  if(type.flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown))throw Error('Unresolved source type '+path)
  if(type.flags&ts.TypeFlags.StringLiteral)return {const:type.value}
  if(type.flags&ts.TypeFlags.NumberLiteral)return {const:type.value}
  if(type.flags&ts.TypeFlags.BooleanLiteral)return {const:type.intrinsicName==='true'}
  if(type.flags&ts.TypeFlags.String)return {type:'string',maxLength:12000}
  if(type.flags&ts.TypeFlags.Number)return {type:'number'}
  if(type.flags&ts.TypeFlags.Null)return {type:'null'}
  if(type.isUnion()){const types=type.types.filter(t=>!(t.flags&ts.TypeFlags.Undefined));return types.length===1?convert(types[0],path,depth+1):{anyOf:types.map(t=>convert(t,path,depth+1))}}
  if(checker.isArrayType(type))return {type:'array',maxItems:2000,items:convert(checker.getTypeArguments(type)[0],path+'[]',depth+1)}
  const properties={},required=[]
  for(const property of type.getProperties()){
   const location=property.valueDeclaration||property.declarations?.[0]||decl
   properties[property.name]=convert(checker.getTypeOfSymbolAtLocation(property,location),path+'.'+property.name,depth+1)
   if(!(property.flags&ts.SymbolFlags.Optional))required.push(property.name)
  }
  return {type:'object',properties,required,additionalProperties:false}
 }
 const schema=convert(checker.getTypeAtLocation(decl),'plan')
 schema.properties.surveyorVersion={const:version}
 schema.$schema='https://json-schema.org/draft/2020-12/schema'
 schema.$id=`urn:azurelocal-configurator:surveyor:${version}:1.0`
 const path=resolve(output,`${version}.schema.json`);writeFileSync(path,JSON.stringify(schema,null,2)+'\n')
 types.push(`export type SurveyorPlan${version.replaceAll('.','')} = ${typeText(schema)}\n`)
 if(version==='2.8.0'){
  const projectDecl=program.getSourceFile(resolve(root,'src/state/project.ts')).statements.find(n=>ts.isInterfaceDeclaration(n)&&n.name.text==='SurveyorProject')
  const projectSchema=convert(checker.getTypeAtLocation(projectDecl),'project')
  projectSchema.properties.appVersion={const:version}
  projectSchema.$schema='https://json-schema.org/draft/2020-12/schema'
  projectSchema.$id='urn:azurelocal-configurator:surveyor-project:2.8.0:1:10'
  writeFileSync(resolve(output,'2.8.0.project.schema.json'),JSON.stringify(projectSchema,null,2)+'\n')
  types.push(`export type SurveyorProject280 = ${typeText(projectSchema)}\n`)
 }
 locks.push({version,schema:'1.0',commit,repository:version==='2.8.0'?'https://github.com/AzureLocal/azurelocal-surveyor':'https://gitlab.com/tierpoint/prodtech/hybrid-cloud/toolkits/configurators',schemaSha256:hash(path),sources:['src/exporters/json.ts','src/engine/types.ts','src/engine/service-presets.ts',...(version==='2.8.0'?['src/engine/inventory.ts','src/engine/fit.ts','src/engine/planning.ts']:[])].map(path=>({path,sha256:hash(resolve(root,path))}))})
 if(version==='2.8.0'){locks.at(-1).projectSchemaSha256=hash(resolve(output,'2.8.0.project.schema.json'));locks.at(-1).sources.push(...['src/state/project.ts','src/state/store.ts'].map(path=>({path,sha256:hash(resolve(root,path))})))}
 console.log(`Generated strict Surveyor ${version} schema`)
}
writeFileSync(resolve(output,'source-lock.json'),JSON.stringify({reviewed:'2026-09-11',contracts:locks},null,2)+'\n')
writeFileSync(resolve(output,'types.ts'),'// Generated from pinned source types; regenerate with Generate-SurveyorSchemas.mjs.\n'+types.join('\n'))
