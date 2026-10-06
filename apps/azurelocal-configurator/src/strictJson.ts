/** JSON syntax plus duplicate-key and nesting checks before values are trusted. */
export function strictJson(text:string):unknown {
 const value:unknown=JSON.parse(text),stack:(Set<string>|null)[]=[]
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='{'||c==='['){stack.push(c==='{'?new Set():null);if(stack.length>80)throw new Error('JSON nesting exceeds 80 levels')}else if(c==='}'||c===']')stack.pop();else if(c==='"'){const start=i;while(++i<text.length){if(text[i]==='\\')i++;else if(text[i]==='"')break}let next=i+1;while(/\s/.test(text[next]??'')&&next<text.length)next++;if(text[next]===':'){const key=JSON.parse(text.slice(start,i+1)) as string;const current=stack.at(-1);if(!current)throw new Error('Invalid JSON object');if(current.has(key))throw new Error(`Duplicate JSON key: ${key}`);if(['__proto__','prototype','constructor'].includes(key))throw new Error('Unsafe JSON property');current.add(key)}}}
 return value
}
