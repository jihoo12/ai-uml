import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapLabel } from '../src/labels.js';

test('keeps all content beyond four lines', () => {
  const content = Array.from({length: 45}, (_, i) => 'word' + i).join(' ');
  const lines = wrapLabel(content, 19);
  assert.ok(lines.length > 4);
  assert.equal(lines.join(' ').replace(/\s+/g, ' '), content);
});
test('wraps long unbroken labels without dropping characters', () => {
  const content = 'X'.repeat(200);
  const lines = wrapLabel(content, 22);
  assert.ok(lines.every(line => Array.from(line).length <= 22));
  assert.equal(lines.join(''), content);
});
test('keeps short labels on one line', () => {
  assert.deepEqual(wrapLabel('Borrow Book', 22), ['Borrow Book']);
});
