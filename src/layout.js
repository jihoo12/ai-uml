import { wrapLabel } from './labels.js';

// Arrange actor-associated use cases first, followed by related use cases.
// Reversing extend dependencies helps lay out the base use case before its extension.
export function computeLayout(model) {
  const ids = model.useCases.map(item => item.id);
  const cases = new Set(ids);
  const adjacency = new Map(ids.map(id => [id, new Set()]));
  const roots = [];
  for (const relation of model.relationships) {
    const fromIsCase = cases.has(relation.from);
    const toIsCase = cases.has(relation.to);
    if (fromIsCase && !toIsCase) roots.push(relation.from);
    if (toIsCase && !fromIsCase) roots.push(relation.to);
    if (fromIsCase && toIsCase) {
      const parent = relation.type === 'extend' ? relation.to : relation.from;
      const child = relation.type === 'extend' ? relation.from : relation.to;
      adjacency.get(parent).add(child);
    }
  }

  const depth = new Map();
  const order = [];
  function explore(seed) {
    if (depth.has(seed)) return;
    depth.set(seed, 0);
    const queue = [seed];
    while (queue.length) {
      const id = queue.shift();
      order.push(id);
      for (const child of adjacency.get(id)) {
        if (!depth.has(child)) {
          depth.set(child, Math.min(2, depth.get(id) + 1));
          queue.push(child);
        }
      }
    }
  }
  roots.forEach(explore);
  ids.forEach(explore);

  const columns = [[], [], []];
  order.forEach(id => columns[depth.get(id)].push(id));

  const rowHeight = Math.max(140, ...model.useCases.map(item => wrapLabel(item.name, 22).length * 20 + 100));
  const maxRows = Math.max(1, ...columns.map(c => c.length), model.actors.length);
  const height = Math.max(470, maxRows * rowHeight + 165);
  const width = 1290;
  const positions = new Map();
  const even = (i, length) => 175 + (i + 1) * (height - 260) / (length + 1);
  model.actors.forEach((actor, i) => positions.set(actor.id, {
    x: 125, y: even(i, model.actors.length), kind: 'actor', name: actor.name
  }));
  columns.forEach((column, col) => {
    for (let i = 0; i < column.length; i++) {
      const item = model.useCases.find(item => item.id === column[i]);
      positions.set(item.id, { x: 465 + col * 295, y: even(i, column.length), kind: 'usecase', name: item.name });
    }
  });
  return { width, height, positions, columns };
}
