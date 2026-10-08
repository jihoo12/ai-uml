import { wrapLabel } from './labels.js';
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, content) => {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
  if (content !== undefined) el.textContent = content;
  return el;
};
const append = (parent, ...children) => { children.forEach(child => parent.appendChild(child)); return parent; };
const line = (x1,y1,x2,y2, attrs = {}) => svgEl('line',{x1,y1,x2,y2,...attrs});
function multiline(parent, text, x, y, maxLength = 22) {
  const lines = wrapLabel(text, maxLength);
  const label = svgEl('text',{x,y:y-(lines.length-1)*9,'text-anchor':'middle','font-size':14,fill:'#17233c'});
  lines.forEach((part,i) => label.appendChild(svgEl('tspan',{x,dy:i?18:0},part)));
  parent.appendChild(label);
}
function stickFigure(parent,x,y) {
  const attrs={stroke:'#263751','stroke-width':2.5,fill:'none','stroke-linecap':'round'};
  append(parent,svgEl('circle',{cx:x,cy:y-18,r:11,...attrs}),line(x,y-7,x,y+31,attrs),line(x-19,y+7,x+19,y+7,attrs),line(x,y+31,x-18,y+54,attrs),line(x,y+31,x+18,y+54,attrs));
}
function edgePoints(a,b) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const startScale=a.kind==='usecase'?Math.min(1,1/Math.sqrt((dx*dx)/(105*105)+(dy*dy)/(Math.max(43,wrapLabel(a.name,22).length*10+18)**2))):Math.min(1,37/Math.max(1,Math.hypot(dx,dy)));
  const endScale=b.kind==='usecase'?Math.min(1,1/Math.sqrt((dx*dx)/(105*105)+(dy*dy)/(Math.max(43,wrapLabel(b.name,22).length*10+18)**2))):Math.min(1,37/Math.max(1,Math.hypot(dx,dy)));
  return {x1:a.x+dx*startScale,y1:a.y+dy*startScale,x2:b.x-dx*endScale,y2:b.y-dy*endScale};
}
export function renderDiagram(model) {
  const actors=model.actors, cases=model.useCases;
  const rowCount=Math.max(actors.length,cases.length,1);
  const maxLines=Math.max(1,...actors.map(actor=>wrapLabel(actor.name,19).length),...cases.map(item=>wrapLabel(item.name,22).length));
  const rowSpacing=Math.max(155,maxLines*20+125);
  const height=Math.max(440,rowCount*rowSpacing+130), width=940;
  const svg=svgEl('svg',{xmlns:NS,viewBox:'0 0 '+width+' '+height,width,height,role:'img','aria-label':model.title});
  append(svg,svgEl('title',{},model.title));
  const defs=svgEl('defs');
  const arrow=svgEl('marker',{id:'arrow',markerWidth:10,markerHeight:10,refX:8,refY:3,orient:'auto',markerUnits:'strokeWidth'});
  arrow.appendChild(svgEl('path',{d:'M0,0 L8,3 L0,6 Z',fill:'none',stroke:'#64748b','stroke-width':1.3}));
  defs.appendChild(arrow);svg.appendChild(defs);
  svg.appendChild(svgEl('text',{x:width/2,y:35,'text-anchor':'middle','font-size':23,'font-weight':700,fill:'#17233c'},model.title));
  const box={x:335,y:76,width:535,height:height-111};
  append(svg,svgEl('rect',{...box,rx:15,fill:'#f7faff',stroke:'#7b94c3','stroke-width':2}),svgEl('text',{x:box.x+box.width/2,y:105,'text-anchor':'middle','font-size':17,'font-weight':600,fill:'#31518c'},model.system));
  const positions=new Map();
  const evenly=(index,total,top,bottom)=>top+(index+1)*(bottom-top)/(total+1);
  actors.forEach((actor,i)=>positions.set(actor.id,{x:140,y:evenly(i,actors.length,118,height-75),kind:'actor',name:actor.name}));
  cases.forEach((item,i)=>positions.set(item.id,{x:600,y:evenly(i,cases.length,130,height-45),kind:'usecase',name:item.name}));
  const connections=svgEl('g',{fill:'none',stroke:'#65748b','stroke-width':1.8});svg.appendChild(connections);
  model.relationships.forEach((rel,index)=>{
    const a=positions.get(rel.from),b=positions.get(rel.to);
    const p=edgePoints(a,b);
    const attrs=rel.type==='association'?{}:{'stroke-dasharray':rel.type==='generalization'?'':'7 5','marker-end':'url(#arrow)'};
    connections.appendChild(line(p.x1,p.y1,p.x2,p.y2,attrs));
    if (rel.type==='include'||rel.type==='extend') {
      const midX=(p.x1+p.x2)/2,midY=(p.y1+p.y2)/2;
      const offset=(index%3-1)*16-11;
      const label='«'+rel.type+'»';
      const w=label.length*7+14;
      append(svg,svgEl('rect',{x:midX-w/2,y:midY+offset-15,width:w,height:19,rx:5,fill:'#fff',stroke:'#e0e7f0'}),svgEl('text',{x:midX,y:midY+offset-2,'text-anchor':'middle','font-size':12,fill:'#51627d'},label));
    }
  });
  actors.forEach(actor=>{
    const p=positions.get(actor.id);
    stickFigure(svg,p.x,p.y-10);
    multiline(svg,actor.name,p.x,p.y+63,19);
  });
  cases.forEach(item=>{
    const p=positions.get(item.id);
    const lineCount=wrapLabel(item.name,22).length;
    svg.appendChild(svgEl('ellipse',{cx:p.x,cy:p.y,rx:108,ry:Math.max(43,lineCount*10+18),fill:'#fff',stroke:'#3f64af','stroke-width':2}));
    multiline(svg,item.name,p.x,p.y+5,22);
  });
  return svg;
}
