#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { parseJSON, parseXML } from '../src/model.js';
import { renderDiagram } from '../src/render.js';

function usage() {
  return 'Usage: node cli/generate-svg.mjs <input.json|input.xml> [output.svg] [--stdout]';
}

function parseArgs(args) {
  if (args.includes('--help') || args.includes('-h')) return { help: true };
  const stdout = args.includes('--stdout');
  const positional = args.filter(arg => arg !== '--stdout');
  if (!positional.length || positional.length > 2 || (stdout && positional.length > 1)) {
    throw new Error(usage());
  }
  const [input, explicitOutput] = positional;
  const ext = path.extname(input).toLowerCase();
  if (ext !== '.json' && ext !== '.xml') throw new Error('Input file must have a .json or .xml extension.');
  const output = explicitOutput ?? path.join(path.dirname(input), path.parse(input).name + '.svg');
  if (!stdout && path.resolve(input) === path.resolve(output)) {
    throw new Error('Output file must differ from the input file.');
  }
  return { input, output, ext, stdout };
}

export async function generate(args) {
  const options = parseArgs(args);
  if (options.help) return { help: true };
  const source = await readFile(options.input, 'utf8');
  const model = options.ext === '.json'
    ? parseJSON(source)
    : parseXML(source, class extends DOMParser {
        constructor() {
          super({
            errorHandler: {
              warning: () => {},
              error: message => { throw new Error('Invalid XML: ' + message); },
              fatalError: message => { throw new Error('Invalid XML: ' + message); }
            }
          });
        }
      });

  // The existing renderer uses only createElementNS; provide a Node-compatible document.
  const previousDocument = globalThis.document;
  try {
    globalThis.document = new DOMImplementation().createDocument(null, null, null);
    const svg = renderDiagram(model);
    const result = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg) + '\n';
    if (options.stdout) process.stdout.write(result);
    else await writeFile(options.output, result, 'utf8');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
  return { output: options.stdout ? null : options.output };
}

const calledDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (calledDirectly) {
  generate(process.argv.slice(2))
    .then(result => {
      if (result.help) console.log(usage());
      else if (result.output) console.log('SVG written to ' + result.output);
    })
    .catch(error => {
      console.error('Error: ' + error.message);
      process.exitCode = 1;
    });
}
