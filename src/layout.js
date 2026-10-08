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

  // Reserve the full rendered bounds of each shape and label, plus a visual gap.
  // Actor captions start below the stick figure; a multi-line label extends downward.
  const actorBounds = actor => ({
    above: 40,
    below: 75 + (wrapLabel(actor.name, 19).length - 1) * 18
  });
  const useCaseBounds = item => {
    const radius = Math.max(43, wrapLabel(item.name, 22).length * 10 + 18);
    return { above: radius, below: radius };
  };
  const nodeById = new Map(model.useCases.map(item => [item.id, item]));
  const groups = [
    model.actors.map(actor => ({ id: actor.id, name: actor.name, kind: 'actor', ...actorBounds(actor) })),
    ...columns.map(column => column.map(id => {
      const item = nodeById.get(id);
      return { id, name: item.name, kind: 'usecase', ...useCaseBounds(item) };
    }))
  ];
  const gap = 32;
  const top = 150;
  const groupHeight = group => group.reduce((total, node) => total + node.above + node.below + gap, 0);
  const height = Math.max(470, top + Math.max(...groups.map(groupHeight)) + 75);
  const width = 1290;
  const positions = new Map();
  groups.forEach((group, groupIndex) => {
    let cursor = top;
    for (const node of group) {
      const y = cursor + node.above;
      positions.set(node.id, {
        x: groupIndex === 0 ? 125 : 465 + (groupIndex - 1) * 295,
        y, kind: node.kind, name: node.name
      });
      cursor = y + node.below + gap;
    }
  });
  return { width, height, positions, columns };
}
