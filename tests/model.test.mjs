import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJSON, validateDiagram } from '../src/model.js';

const valid={
  type:'usecase',title:'Test',system:'Application',
  actors:[{id:'user',name:'User'}],
  useCases:[{id:'login',name:'Login'}],
  relationships:[{from:'user',to:'login',type:'association'}]
};
test('accepts a valid use case model',()=>{
  const result=parseJSON(JSON.stringify(valid));
  assert.equal(result.relationships[0].type,'association');
  assert.equal(result.useCases[0].name,'Login');
});
test('defaults relationship type to association',()=>{
  const result=validateDiagram({...valid,relationships:[{from:'user',to:'login'}]});
  assert.equal(result.relationships[0].type,'association');
});
test('rejects duplicate identifiers',()=>{
  assert.throws(()=>validateDiagram({...valid,useCases:[{id:'user',name:'Login'}]}),/Duplicate ID/);
});
test('rejects unknown relationship targets',()=>{
  assert.throws(()=>validateDiagram({...valid,relationships:[{from:'user',to:'missing',type:'include'}]}),/Unknown relationship/);
});
test('rejects unsupported diagram types and relationships',()=>{
  assert.throws(()=>validateDiagram({...valid,type:'class'}),/Only type/);
  assert.throws(()=>validateDiagram({...valid,relationships:[{from:'user',to:'login',type:'unknown'}]}),/Unsupported/);
});
test('rejects empty and malformed JSON',()=>{
  assert.throws(()=>parseJSON('{'),/Invalid JSON/);
  assert.throws(()=>validateDiagram({...valid,useCases:[]}),/At least one/);
});
