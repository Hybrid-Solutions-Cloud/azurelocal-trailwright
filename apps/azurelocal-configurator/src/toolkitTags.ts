/** Flat tag object with duplicate detection before JSON.parse can discard a key. */
export function toolkitTags(text:string):Record<string,string>{
 const input=text||'{}',parsed:unknown=JSON.parse(input)
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Tags must be a JSON object.')
 const entries=Object.entries(parsed)
 if(entries.length>50||entries.some(([key,value])=>!key||key.length>512||['__proto__','constructor','prototype'].includes(key)||typeof value!=='string'||value.length>256))throw new Error('Use at most 50 string tags, keys ≤512 characters and values ≤256 characters.')
 const seen=new Set<string>()
 for(const token of input.matchAll(/"(?:[^"\\]|\\.)*"/g)){
  if(!/^\s*:/.test(input.slice(token.index!+token[0].length)))continue
  const key=String(JSON.parse(token[0])).toLowerCase()
  if(seen.has(key))throw new Error('Duplicate or differently cased tag keys are ambiguous to the Toolkit reader.')
  seen.add(key)
 }
 return parsed as Record<string,string>
}
