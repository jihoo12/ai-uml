const RELATION_TYPES = new Set(['association', 'include', 'extend', 'generalization']);
const MAX_NODES = 120;
const MAX_RELATIONSHIPS = 400;

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field + ' must be a non-empty string.');
  if (value.length > 200) throw new Error(field + ' must be at most 200 characters.');
  return value.trim();
}

export function validateDiagram(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Diagram must be an object.');
  if (data.type !== 'usecase') throw new Error('Only type "usecase" is supported.');
  const title = requiredString(data.title ?? 'Use Case Diagram', 'title');
  const system = requiredString(data.system ?? 'System', 'system');
  if (!Array.isArray(data.actors) || !Array.isArray(data.useCases)) throw new Error('actors and useCases must be arrays.');
  if (!Array.isArray(data.relationships)) throw new Error('relationships must be an array.');
  if (data.actors.length + data.useCases.length > MAX_NODES) throw new Error('Maximum 120 actors/use cases allowed.');
  if (data.relationships.length > MAX_RELATIONSHIPS) throw new Error('Maximum 400 relationships allowed.');
  if (!data.useCases.length) throw new Error('At least one use case is required.');
  const ids = new Set();
  const readNodes = (nodes, kind) => nodes.map((node, index) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error(kind + '[' + index + '] must be an object.');
    const id = requiredString(node.id, kind + '[' + index + '].id');
    const name = requiredString(node.name, kind + '[' + index + '].name');
    if (ids.has(id)) throw new Error('Duplicate ID: ' + id);
    ids.add(id);
    return { id, name };
  });
  const actors = readNodes(data.actors, 'actors');
  const useCases = readNodes(data.useCases, 'useCases');
  const relationships = data.relationships.map((relation, index) => {
    if (!relation || typeof relation !== 'object' || Array.isArray(relation)) throw new Error('relationships[' + index + '] must be an object.');
    const from = requiredString(relation.from, 'relationships[' + index + '].from');
    const to = requiredString(relation.to, 'relationships[' + index + '].to');
    const type = requiredString(relation.type ?? 'association', 'relationships[' + index + '].type');
    if (!ids.has(from) || !ids.has(to)) throw new Error('Unknown relationship reference: ' + from + ' → ' + to);
    if (from === to) throw new Error('Self-referential relationship: ' + from);
    if (!RELATION_TYPES.has(type)) throw new Error('Unsupported relationship type: ' + type);
    return { from, to, type };
  });
  return { type: 'usecase', title, system, actors, useCases, relationships };
}

export function parseJSON(text) {
  let data;
  try { data = JSON.parse(text); } catch (error) { throw new Error('Invalid JSON: ' + error.message); }
  return validateDiagram(data);
}

export function xmlToObject(xml, DOMParserClass = globalThis.DOMParser) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('DTD and entity declarations are not allowed.');
  if (!DOMParserClass) throw new Error('XML parsing requires a browser DOMParser.');
  const doc = new DOMParserClass().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML syntax.');
  const root = doc.documentElement;
  if (root.tagName !== 'diagram') throw new Error('XML root must be <diagram>.');
  const direct = (parent, tag) => Array.from(parent?.children ?? []).filter(el => el.tagName === tag);
  const single = tag => direct(root, tag)[0];
  const nodes = (container, tag) => direct(single(container), tag).map(el => ({ id: el.getAttribute('id'), name: el.getAttribute('name') }));
  const relations = direct(single('relationships'), 'relationship').map(el => ({
    from: el.getAttribute('from'), to: el.getAttribute('to'), type: el.getAttribute('type') ?? 'association'
  }));
  return {
    type: root.getAttribute('type'), title: root.getAttribute('title') ?? 'Use Case Diagram',
    system: root.getAttribute('system') ?? 'System', actors: nodes('actors', 'actor'),
    useCases: nodes('useCases', 'useCase'), relationships: relations
  };
}

export function parseXML(text, DOMParserClass) {
  return validateDiagram(xmlToObject(text, DOMParserClass));
}
