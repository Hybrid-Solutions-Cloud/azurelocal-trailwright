import type {ArmParameter,ArmTemplate,Json} from './armContract'
type Expression={kind:'literal';value:Json}|{kind:'call';name:string;args:Expression[]}|{kind:'member';base:Expression;key:Expression}
/** Parser for the explicit pure-expression subset used by the pinned source.
 * No eval, network functions, credential resolution or infrastructure operations.
 */
export function parseArmExpression(text:string):Expression{
 let position=0,depth=0
 const space=()=>{while(/\s/.test(text[position]??'')&&position<text.length)position++}
 const fail=()=>{throw new Error(`Unsupported ARM expression syntax at character ${position}.`)}
 const value=():Expression=>{if(++depth>64)throw new Error('ARM expression nesting limit exceeded.');space();let result:Expression
  if(text[position]==="'"){position++;let resultText='',closed=false;while(position<text.length){const char=text[position++];if(char==="'"){if(text[position]==="'"){resultText+="'";position++;continue}closed=true;break}resultText+=char}if(!closed)fail();result={kind:'literal',value:resultText}}
  else if(/[-0-9]/.test(text[position]??'')&&position<text.length){const match=text.slice(position).match(/^-?\d+/);if(!match)fail();position+=match![0].length;result={kind:'literal',value:Number(match![0])}}
  else {const match=text.slice(position).match(/^[A-Za-z_][A-Za-z_0-9]*/);if(!match)fail();position+=match![0].length;const name=match![0];space();if(text[position++]!=='(')fail();const args:Expression[]=[];space();if(text[position]!==')'){while(position<text.length){args.push(value());space();if(text[position]===')')break;if(text[position++]!==',')fail()}}if(text[position++]!==')')fail();result={kind:'call',name:name.toLowerCase(),args}}
  space();while(text[position]==='.'||text[position]==='['){if(text[position++]==='.'){const match=text.slice(position).match(/^[A-Za-z_][A-Za-z_0-9]*/);if(!match)fail();position+=match![0].length;result={kind:'member',base:result,key:{kind:'literal',value:match![0]}}}else {const key=value();space();if(text[position++]!==']')fail();result={kind:'member',base:result,key}}space()}
  depth--;return result
 }
 const result=value();space();if(position!==text.length)fail();return result
}
export interface ArmContext {cloud:string;subscription:string;resourceGroup:string}
export function armEvaluator(template:ArmTemplate,parameters:Record<string,ArmParameter>,context:ArmContext){
 const variables=(template.variables??{}) as Record<string,Json>,cache=new Map<string,Json>(),resolving=new Set<string>()
 const find=<T>(values:Record<string,T>,name:string):T=>{const key=Object.keys(values).find(k=>k.toLowerCase()===name.toLowerCase());if(key===undefined)throw new Error(`Unknown ARM input ${name}.`);return values[key]}
 const text=(value:Json)=>{if(typeof value!=='string')throw new Error('ARM function expected text.');return value}
 const bool=(value:Json)=>{if(typeof value!=='boolean')throw new Error('ARM function expected a boolean.');return value}
 const variable=(name:string,indices:Record<string,number>):Json=>{
  const key=name.toLowerCase();if(cache.has(key))return cache.get(key)!;if(resolving.has(key))throw new Error(`Cyclic ARM variable ${name}.`);resolving.add(key)
  try{const loops=Array.isArray(variables.copy)?variables.copy:[],loop=loops.find(v=>v&&typeof v==='object'&&!Array.isArray(v)&&String(v.name).toLowerCase()===key) as Record<string,Json>|undefined
   const result=loop?Array.from({length:count(walk(loop.count,indices))},(_,index)=>walk(loop.input,{...indices,[key]:index})):walk(find(variables,name),indices);cache.set(key,result);return result
  }finally{resolving.delete(key)}
 }
 const count=(value:Json)=>{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>2000)throw new Error('ARM copy count outside the reviewed limit.');return value}
 const run=(node:Expression,indices:Record<string,number>):Json=>{
  if(node.kind==='literal')return node.value
  if(node.kind==='member'){const base=run(node.base,indices),key=run(node.key,indices);if(Array.isArray(base)){if(typeof key!=='number'||!Number.isSafeInteger(key)||key<0||key>=base.length)throw new Error('ARM array index outside the input.');return base[key]}if(!base||typeof base!=='object'||typeof key!=='string')throw new Error('ARM property access has an invalid input.');return find(base,key)}
  const {name,args}=node,arity=(min:number,max=min)=>{if(args.length<min||args.length>max)throw new Error(`Invalid argument count for ARM ${name}.`)}
  // ARM if is lazy. Inactive source branches must not resolve credentials or absent references.
  if(name==='if'){arity(3);return run(args[bool(run(args[0],indices))?1:2],indices)}
  if(name==='parameters'){arity(1);const key=text(run(args[0],indices)),parameter=find(parameters,key);if(!('value'in parameter))throw new Error(`Runtime secret ${key} cannot be evaluated by the design application.`);return parameter.value}
  if(name==='variables'){arity(1);return variable(text(run(args[0],indices)),indices)}
  if(name==='environment'){arity(0);return {name:context.cloud}}
  if(name==='subscription'){arity(0);return {subscriptionId:context.subscription,id:`/subscriptions/${context.subscription}`}}
  if(name==='resourcegroup'){arity(0);return {name:context.resourceGroup,id:`/subscriptions/${context.subscription}/resourceGroups/${context.resourceGroup}`}}
  if(name==='copyindex'){arity(0,1);const key=args.length?text(run(args[0],indices)).toLowerCase():'';if(indices[key]===undefined)throw new Error('ARM copyIndex has no active loop.');return indices[key]}
  const values=args.map(a=>run(a,indices))
  switch(name){
   case 'equals':arity(2);if(values.some(v=>v!==null&&typeof v==='object'))throw new Error('ARM object equality is outside this pinned scalar comparison contract.');return values[0]===values[1]
   case 'not':arity(1);return !bool(values[0])
   case 'empty':arity(1);return values[0]===null||typeof values[0]==='string'||Array.isArray(values[0])?values[0]===null||values[0].length===0:typeof values[0]==='object'?Object.keys(values[0]).length===0:(()=>{throw new Error('ARM empty has an invalid input.')})()
   case 'length':arity(1);if(typeof values[0]==='string'||Array.isArray(values[0]))return values[0].length;throw new Error('ARM length has an invalid input.')
   case 'concat':arity(1,100);return values.map(text).join('')
   case 'contains':arity(2);if(Array.isArray(values[0]))return values[0].some(v=>JSON.stringify(v)===JSON.stringify(values[1]));if(typeof values[0]==='string')return values[0].includes(text(values[1]));throw new Error('ARM contains has an unsupported input.')
   case 'json':arity(1);return JSON.parse(text(values[0])) as Json
   case 'format':arity(1,100);return text(values[0]).replace(/\{(\d+)\}/g,(_,index)=>{const v=values[Number(index)+1];if(v===undefined)throw new Error('ARM format placeholder is missing.');return String(v)})
   default:throw new Error(`ARM function ${name} has no reviewed offline implementation.`)
  }
 }
 const walk=(value:Json,indices:Record<string,number>={}):Json=>{
  if(typeof value==='string'&&value.startsWith('[['))return value.slice(1)
  if(typeof value==='string'&&value.startsWith('[')&&value.endsWith(']'))return run(parseArmExpression(value.slice(1,-1)),indices)
  if(Array.isArray(value))return value.map(v=>walk(v,indices))
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v,indices)]))
  return value
 }
 return {evaluate:walk,count}
}
