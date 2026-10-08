import { parseJSON, parseXML } from './model.js';
import { renderDiagram } from './render.js';

const $ = id => document.getElementById(id);
const samples = {
  json: JSON.stringify({
    type:'usecase',title:'Library System',system:'Library',
    actors:[{id:'member',name:'Member'},{id:'librarian',name:'Librarian'}],
    useCases:[{id:'search',name:'Search Books'},{id:'borrow',name:'Borrow Book'},{id:'auth',name:'Authenticate'}],
    relationships:[{from:'member',to:'search',type:'association'},{from:'member',to:'borrow',type:'association'},{from:'librarian',to:'borrow',type:'association'},{from:'borrow',to:'auth',type:'include'}]
  },null,2),
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<diagram type="usecase" title="Library System" system="Library">
  <actors>
    <actor id="member" name="Member"/>
    <actor id="librarian" name="Librarian"/>
  </actors>
  <useCases>
    <useCase id="search" name="Search Books"/>
    <useCase id="borrow" name="Borrow Book"/>
    <useCase id="auth" name="Authenticate"/>
  </useCases>
  <relationships>
    <relationship from="member" to="search" type="association"/>
    <relationship from="member" to="borrow" type="association"/>
    <relationship from="librarian" to="borrow" type="association"/>
    <relationship from="borrow" to="auth" type="include"/>
  </relationships>
</diagram>`
};
let currentSVG=null;
function setStatus(message,isError=false) { $('status').textContent=message; $('status').className=isError?'error':'success'; }
function loadSample() { $('source').value=samples[$('format').value]; draw(); }
function draw() {
  try {
    const format=$('format').value;
    const model=format==='json'?parseJSON($('source').value):parseXML($('source').value);
    const svg=renderDiagram(model);
    $('canvas').replaceChildren(svg);currentSVG=svg;$('download').disabled=false;
    setStatus('Rendered '+model.actors.length+' actor(s), '+model.useCases.length+' use case(s), and '+model.relationships.length+' relationship(s).');
  } catch(error) {
    currentSVG=null;$('download').disabled=true;
    $('canvas').replaceChildren(Object.assign(document.createElement('p'),{className:'empty',textContent:'Fix the input to preview your diagram.'}));
    setStatus(error.message,true);
  }
}
$('format').addEventListener('change',loadSample);
$('sample').addEventListener('click',loadSample);
$('render').addEventListener('click',draw);
$('upload').addEventListener('change',async(event)=>{
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>1024*1024){setStatus('Files must be smaller than 1 MB.',true);return;}
  $('format').value=file.name.toLowerCase().endsWith('.xml')?'xml':'json';
  $('source').value=await file.text();draw();event.target.value='';
});
$('download').addEventListener('click',()=>{
  if(!currentSVG)return;
  const source=new XMLSerializer().serializeToString(currentSVG);
  const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='use-case-diagram.svg';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
loadSample();
