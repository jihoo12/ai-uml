import { wrapLabel } from '../src/labels.js';
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

function assertNoVerticalOverlap(model) {
  const { positions } = computeLayout(model);
  const nodes = [
    ...model.actors.map(actor => ({
      p: positions.get(actor.id),
      above: 40,
      below: 75 + (wrapLabel(actor.name, 19).length - 1) * 18
    })),
    ...model.useCases.map(item => {
      const radius = Math.max(43, wrapLabel(item.name, 22).length * 10 + 18);
      return { p: positions.get(item.id), above: radius, below: radius };
    })
  ];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a.p.x !== b.p.x) continue;
      const [first, second] = a.p.y <= b.p.y ? [a, b] : [b, a];
      assert.ok(first.p.y + first.below + 20 <= second.p.y - second.above,
        'Nodes overlap: ' + first.p.name + ' / ' + second.p.name);
    }
  }
}
test('default Library use cases keep enough space for full ellipses', () => {
  const library = {
    actors: [{ id:'member', name:'Member' }],
    useCases:[{ id:'search',name:'Search Books' },{ id:'borrow',name:'Borrow Book' },{ id:'auth',name:'Authenticate' }],
    relationships:[{ from:'member',to:'search',type:'association' },{ from:'member',to:'borrow',type:'association' },{ from:'borrow',to:'auth',type:'include' }]
  };
  assertNoVerticalOverlap(library);
});
test('long wrapped actor captions cannot collide with neighboring actors', () => {
  const longName = 'Very Long Actor Name '.repeat(9).trim();
  const model = {
    actors:[{ id:'a',name:longName },{ id:'b',name:longName },{ id:'c',name:'Guest' }],
    useCases:[{ id:'start',name:'Start' }],
    relationships:[{ from:'a',to:'start',type:'association' }]
  };
  assertNoVerticalOverlap(model);
  const positions=computeLayout(model).positions;
  assert.ok(positions.get('b').y - positions.get('a').y > 200);
});
test('long use case labels and mixed columns retain spacing', () => {
  const model = {
    actors:[{ id:'a',name:'Guest' }],
    useCases:[{ id:'x',name:'Long Use Case '.repeat(14).trim() },{ id:'y',name:'Short' },{ id:'z',name:'Another case' }],
    relationships:[{ from:'a',to:'x',type:'association' },{ from:'a',to:'y',type:'association' }]
  };
  assertNoVerticalOverlap(model);
});
