import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = new URL('../cli/generate-svg.mjs', import.meta.url).pathname;
const example = new URL('../examples/order-system.json', import.meta.url).pathname;
const xmlExample = new URL('../examples/order-system.xml', import.meta.url).pathname;

test('CLI generates matching SVG output for JSON and XML', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ai-uml-'));
  try {
    for (const [input, name] of [[example,'json.svg'], [xmlExample,'xml.svg']]) {
      const output = path.join(dir,name);
      const run = spawnSync(process.execPath,[cli,input,output],{encoding:'utf8'});
      assert.equal(run.status,0,run.stderr);
      const svg = await readFile(output,'utf8');
      assert.match(svg,/^<\?xml version="1.0"/);
      assert.match(svg,/<svg\b/);
      assert.match(svg,/Place Order/);
      assert.match(svg,/«include»/);
    }
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('CLI reports invalid diagram and does not create output', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ai-uml-'));
  try {
    const input=path.join(dir,'invalid.json');
    const output=path.join(dir,'out.svg');
    await writeFile(input, '{"type":"usecase","actors":[],"useCases":[],"relationships":[]}');
    const run=spawnSync(process.execPath,[cli,input,output],{encoding:'utf8'});
    assert.notEqual(run.status,0);
    await assert.rejects(readFile(output));
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('CLI stdout emits SVG without status messages', () => {
  const run=spawnSync(process.execPath,[cli,example,'--stdout'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.match(run.stdout,/^<\?xml version="1.0"/);
  assert.match(run.stdout,/<svg\b/);
});
