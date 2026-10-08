import { parseXmlDiagram, toXmlDiagram } from "./xml.js";

export const MAX_SOURCE_LENGTH = 150_000;
export const DIAGRAM_TYPES = ["flowchart", "class", "sequence"];
const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const DIRECTIONS = ["LR", "RL", "TB", "BT"];
const SHAPES = ["rectangle", "round", "diamond", "circle", "database"];
const RELATIONS = ["association", "inheritance", "composition", "aggregation", "dependency"];
const MESSAGE_TYPES = ["sync", "async", "return", "dashed"];

export class DiagramError extends Error {
  constructor(message) {
    super(message);
    this.name = "DiagramError";
  }
}

function reject(path, message) {
  throw new DiagramError(`${path}: ${message}`);
}

function object(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject(path, "객체(object)여야 합니다.");
  }
  return value;
}

function string(value, path, options = {}) {
  if (typeof value !== "string" || !value.trim()) {
    reject(path, "비어 있지 않은 문자열이어야 합니다.");
  }
  const text = value.trim();
  if (text.length > (options.max ?? 200)) reject(path, "문자열이 너무 깁니다.");
  return text;
}

function optionalString(value, path, max = 200) {
  return value === undefined || value === null || value === ""
    ? undefined
    : string(value, path, { max });
}

function identifier(value, path) {
  const id = string(value, path, { max: 64 });
  if (!ID_PATTERN.test(id)) {
    reject(path, "영문자로 시작하고 영문·숫자·밑줄(_)만 사용할 수 있습니다.");
  }
  return id;
}

function choice(value, path, values, fallback) {
  const selected = value === undefined ? fallback : value;
  if (!values.includes(selected)) reject(path, `허용 값: ${values.join(", ")}`);
  return selected;
}

function list(value, path, max, minimum = 1) {
  if (!Array.isArray(value)) reject(path, "배열(array)이어야 합니다.");
  if (value.length < minimum || value.length > max) {
    reject(path, `항목은 ${minimum}개 이상, ${max}개 이하여야 합니다.`);
  }
  return value;
}

function unique(items, path) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) reject(path, `중복 ID: ${item.id}`);
    seen.add(item.id);
  }
  return seen;
}

function existing(id, known, path) {
  if (!known.has(id)) reject(path, `존재하지 않는 ID: ${id}`);
  return id;
}

function stringList(value, path, max = 30) {
  if (value === undefined) return [];
  return list(value, path, max, 0).map((item, index) =>
    string(item, `${path}[${index}]`, { max: 160 })
  );
}

export function validateDiagram(input) {
  const raw = object(input, "diagram");
  const type = choice(raw.type, "type", DIAGRAM_TYPES);
  const title = optionalString(raw.title, "title", 100);
  const result = { type };
  if (title !== undefined) result.title = title;

  if (type === "flowchart") {
    result.direction = choice(raw.direction, "direction", DIRECTIONS, "LR");
    result.nodes = list(raw.nodes, "nodes", 60).map((entry, index) => {
      const path = `nodes[${index}]`;
      const node = object(entry, path);
      return {
        id: identifier(node.id, `${path}.id`),
        label: string(node.label, `${path}.label`),
        shape: choice(node.shape, `${path}.shape`, SHAPES, "rectangle"),
      };
    });
    const known = unique(result.nodes, "nodes");
    result.edges = list(raw.edges ?? [], "edges", 150, 0).map((entry, index) => {
      const path = `edges[${index}]`;
      const edge = object(entry, path);
      const from = existing(identifier(edge.from, `${path}.from`), known, path);
      const to = existing(identifier(edge.to, `${path}.to`), known, path);
      const label = optionalString(edge.label, `${path}.label`);
      return label ? { from, to, label } : { from, to };
    });
  } else if (type === "class") {
    result.classes = list(raw.classes, "classes", 50).map((entry, index) => {
      const path = `classes[${index}]`;
      const cls = object(entry, path);
      return {
        id: identifier(cls.id, `${path}.id`),
        attributes: stringList(cls.attributes, `${path}.attributes`),
        methods: stringList(cls.methods, `${path}.methods`),
      };
    });
    const known = unique(result.classes, "classes");
    result.relations = list(raw.relations ?? [], "relations", 120, 0).map((entry, index) => {
      const path = `relations[${index}]`;
      const rel = object(entry, path);
      const from = existing(identifier(rel.from, `${path}.from`), known, path);
      const to = existing(identifier(rel.to, `${path}.to`), known, path);
      const type = choice(rel.type, `${path}.type`, RELATIONS, "association");
      const label = optionalString(rel.label, `${path}.label`);
      return label ? { from, to, type, label } : { from, to, type };
    });
  } else {
    result.participants = list(raw.participants, "participants", 30).map((entry, index) => {
      const path = `participants[${index}]`;
      const participant = object(entry, path);
      return {
        id: identifier(participant.id, `${path}.id`),
        label: string(participant.label, `${path}.label`),
      };
    });
    const known = unique(result.participants, "participants");
    result.messages = list(raw.messages, "messages", 200).map((entry, index) => {
      const path = `messages[${index}]`;
      const msg = object(entry, path);
      return {
        from: existing(identifier(msg.from, `${path}.from`), known, path),
        to: existing(identifier(msg.to, `${path}.to`), known, path),
        text: string(msg.text, `${path}.text`),
        type: choice(msg.type, `${path}.type`, MESSAGE_TYPES, "sync"),
      };
    });
  }
  return result;
}

export function parseDiagram(text, format = "json") {
  if (typeof text !== "string" || !text.trim()) {
    throw new DiagramError("다이어그램 내용을 입력해 주세요.");
  }
  if (text.length > MAX_SOURCE_LENGTH) {
    throw new DiagramError("입력은 150KB 이하로 제한됩니다.");
  }
  let data;
  if (format === "json") {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new DiagramError(`JSON 문법 오류: ${error.message}`);
    }
  } else if (format === "xml") {
    data = parseXmlDiagram(text);
  } else {
    throw new DiagramError("지원하지 않는 형식입니다. JSON 또는 XML을 사용하세요.");
  }
  return validateDiagram(data);
}

export function serializeDiagram(spec, format = "json") {
  const normalized = validateDiagram(spec);
  if (format === "json") return JSON.stringify(normalized, null, 2);
  if (format === "xml") return toXmlDiagram(normalized);
  throw new DiagramError("지원하지 않는 형식입니다.");
}

// Mermaid identifiers are generated internally, so even valid but reserved user IDs
// cannot be interpreted as Mermaid keywords.
function mermaidText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\|/g, "&#124;")
    .replace(/%%/g, "% %");
}

function memberText(text) {
  return mermaidText(text).replace(/[{}]/g, " ");
}

const FLOW_SHAPES = {
  rectangle: (id, label) => `${id}["${label}"]`,
  round: (id, label) => `${id}("${label}")`,
  diamond: (id, label) => `${id}{"${label}"}`,
  circle: (id, label) => `${id}(("${label}"))`,
  database: (id, label) => `${id}[("${label}")]`,
};

const CLASS_ARROWS = {
  association: "-->",
  inheritance: "--|>",
  composition: "*--",
  aggregation: "o--",
  dependency: "..>",
};

const MESSAGE_ARROWS = {
  sync: "->>",
  async: "-)",
  return: "-->>",
  dashed: "-->",
};

export function toMermaid(input) {
  const spec = validateDiagram(input);
  if (spec.type === "flowchart") {
    const lines = [`flowchart ${spec.direction}`];
    for (const node of spec.nodes) {
      lines.push(`    ${FLOW_SHAPES[node.shape](`n_${node.id}`, mermaidText(node.label))}`);
    }
    for (const edge of spec.edges) {
      const middle = edge.label ? `-->|"${mermaidText(edge.label)}"|` : "-->";
      lines.push(`    n_${edge.from} ${middle} n_${edge.to}`);
    }
    return lines.join("\n");
  }
  if (spec.type === "class") {
    const lines = ["classDiagram"];
    for (const cls of spec.classes) {
      lines.push(`    class C_${cls.id} {`);
      for (const item of cls.attributes) lines.push(`        ${memberText(item)}`);
      for (const item of cls.methods) lines.push(`        ${memberText(item)}`);
      lines.push("    }");
    }
    for (const rel of spec.relations) {
      const label = rel.label ? ` : ${mermaidText(rel.label)}` : "";
      lines.push(`    C_${rel.from} ${CLASS_ARROWS[rel.type]} C_${rel.to}${label}`);
    }
    return lines.join("\n");
  }
  const lines = ["sequenceDiagram", "    autonumber"];
  for (const p of spec.participants) {
    lines.push(`    participant p_${p.id} as ${mermaidText(p.label)}`);
  }
  for (const m of spec.messages) {
    lines.push(`    p_${m.from}${MESSAGE_ARROWS[m.type]}p_${m.to}: ${mermaidText(m.text)}`);
  }
  return lines.join("\n");
}
