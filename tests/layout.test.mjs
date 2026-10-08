import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseJSON } from '../src/model.js';
import { computeLayout } from '../src/layout.js';

const sample = parseJSON(readFileSync(new URL('../examples/hotel-room-booking.json', import.meta.url),'utf8'));

test('places related use cases in successive columns',()=>{
  const layout=computeLayout(sample);
  assert.equal(layout.positions.get('reserve').x,465);
  assert.equal(layout.positions.get('options').x,760);
  assert.equal(layout.positions.get('confirmation').x,760);
  assert.equal(layout.positions.get('type').x,1055);
  assert.equal(layout.positions.get('size').x,1055);
  assert.equal(layout.positions.get('price').x,1055);
});
test('keeps actors outside the system boundary',()=>{
  const layout=computeLayout(sample);
  assert.ok(layout.positions.get('customer').x<318);
  for(const item of sample.useCases) assert.ok(layout.positions.get(item.id).x>318);
});
test('lays out disconnected use cases too',()=>{
  const model={...sample,useCases:[...sample.useCases,{id:'other',name:'Other'}]};
  const layout=computeLayout(model);
  assert.ok(layout.positions.has('other'));
});
test('is deterministic',()=>{
  const a=computeLayout(sample),b=computeLayout(sample);
  for(const item of sample.useCases) assert.deepEqual(a.positions.get(item.id),b.positions.get(item.id));
});
