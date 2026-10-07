import type {ArmTemplate,ArmParameter,Json} from './armContract'
import {armEvaluator,type ArmContext} from './armExpressions'
import {validateArmDeploymentBody} from './armApi'
export interface ArmResourceEffect {symbol:string;type:string;apiVersion:string;condition:Json;active:boolean|null;count:number|null;names:string[];writesSecrets:boolean;nestedTemplate:boolean;scopeExpression:Json|null;dependsOn:Json[]}
export function inspectArmDeployment(template:ArmTemplate,parameters:Record<string,ArmParameter>,context:ArmContext){
 const evaluator=armEvaluator(template,parameters,context),issues:{path:string;message:string}[]=[],resources:ArmResourceEffect[]=[]
 let deploymentSettings:Json|null=null
 try{const resource=template.resources.DeploymentSettings as Record<string,Json>;if(!resource?.properties)throw new Error('Pinned deployment settings resource is missing.');deploymentSettings=evaluator.evaluate(resource.properties);issues.push(...validateArmDeploymentBody(deploymentSettings))}catch(error){issues.push({path:'DeploymentSettings',message:(error as Error).message})}
 for(const [symbol,input]of Object.entries(template.resources)){
  const resource=input as Record<string,Json>,copy=resource.copy as Record<string,Json>|undefined,effect:ArmResourceEffect={symbol,type:String(resource.type),apiVersion:String(resource.apiVersion),condition:resource.condition??true,active:null,count:null,names:[],writesSecrets:String(resource.type).toLowerCase()==='microsoft.keyvault/vaults/secrets',nestedTemplate:String(resource.type).toLowerCase()==='microsoft.resources/deployments',scopeExpression:resource.scope??null,dependsOn:Array.isArray(resource.dependsOn)?resource.dependsOn:[]}
  try{const active=evaluator.evaluate(effect.condition);if(typeof active!=='boolean')throw new Error('Resource condition did not produce a boolean.');effect.active=active;effect.count=active?(copy?evaluator.count(evaluator.evaluate(copy.count)):1):0
   for(let index=0;index<effect.count;index++){const value=evaluator.evaluate(resource.name,{'':index,...(copy?{[String(copy.name).toLowerCase()]:index}:{})});if(typeof value!=='string')throw new Error('Resource name did not produce text.');effect.names.push(value)}
  }catch(error){issues.push({path:`resources.${symbol}`,message:(error as Error).message})}
  resources.push(effect)
 }
 return {deploymentSettings,resources,issues,qualification:'offline-source-evaluation',runtimeQualified:false,limitations:['Resource conditions, names, copy counts and the deploymentSettings input body are evaluated.','Nested deployment bodies, live resource references, listKeys, secret values and provider execution are not evaluated.']}
}
