import type {jsPDF} from 'jspdf'
import type {Project} from './project'
import {diagramPages} from './topology'
/** Vector topology stays readable in PDF; long pages continue with explicit edge references. */
export function appendPdfTopology(doc:jsPDF,p:Project){
 for(const page of diagramPages(p))for(let offset=0;offset<Math.max(1,page.nodes.length);offset+=18){
  doc.addPage();doc.setFontSize(15);doc.text(`${page.name} topology${offset?' (continued)':''}`,16,18);doc.setFontSize(8);doc.text('Design intent. Reference nodes preserve cross-page relationships; runtime state is unverified.',16,25)
  const nodes=page.nodes.slice(offset,offset+18),ids=new Set(nodes.map(n=>n.id)),positions=new Map(nodes.map((n,i)=>[n.id,{x:16+(i%3)*60,y:34+Math.floor(i/3)*26}]))
  doc.setDrawColor(116,135,151);for(const edge of page.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))){const a=positions.get(edge.from)!,b=positions.get(edge.to)!;doc.line(a.x+25,a.y+17,b.x+25,b.y);doc.line(b.x+25,b.y,b.x+24,b.y-2);doc.line(b.x+25,b.y,b.x+26,b.y-2)}
  for(const n of nodes){const pos=positions.get(n.id)!;doc.setFillColor(237,245,255);doc.setDrawColor(36,115,168);doc.roundedRect(pos.x,pos.y,53,18,1,1,'FD');doc.setFontSize(7);doc.setTextColor(23,57,88);const lines=doc.splitTextToSize(n.label.replace(/\n/g,' - '),48).slice(0,5);doc.text(lines,pos.x+2,pos.y+4)}
  let y=nodes.length?42+Math.ceil(nodes.length/3)*26:40;doc.setTextColor(0,0,0);doc.setFontSize(8)
  if(!nodes.length)doc.text('No records entered for this diagram.',16,y)
  for(const edge of page.edges.filter(e=>ids.has(e.from))){const from=page.nodes.find(n=>n.id===edge.from)!,to=page.nodes.find(n=>n.id===edge.to)!;const label=`${from.label.split('\n')[1]} -> ${to.label.split('\n')[1]}: ${edge.label}${ids.has(edge.to)?'':' (reference on another diagram page)'}`;const lines=doc.splitTextToSize(label,177);if(y+lines.length*4>274){doc.addPage();y=24;doc.setFontSize(8)}doc.text(lines,16,y);y+=lines.length*4+2}
 }
}
