// XML is only an interchange format. All semantic validation happens in diagram.js.
function error(message) {
  throw new Error(`XML 오류: ${message}`);
}

function children(parent, tag) {
  if (!parent) return [];
  return Array.from(parent.children).filter((element) => element.tagName === tag);
}

function first(parent, tag) {
  return children(parent, tag)[0] ?? null;
}

function xmlAttribute(element, name) {
  return element.hasAttribute(name) ? element.getAttribute(name) : undefined;
}

export function parseXmlDiagram(source) {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) {
    error("보안을 위해 DOCTYPE/ENTITY 선언을 허용하지 않습니다.");
  }
  if (typeof DOMParser === "undefined") {
    error("이 환경은 XML 파서를 지원하지 않습니다.");
  }
  const document = new DOMParser().parseFromString(source, "application/xml");
  const parsingError = document.getElementsByTagName("parsererror")[0];
  if (parsingError) error(parsingError.textContent.trim().slice(0, 240));
  const root = document.documentElement;
  if (!root || root.tagName !== "diagram") error("최상위 요소는 <diagram>이어야 합니다.");

  const type = xmlAttribute(root, "type");
  const result = { type };
  const title = xmlAttribute(root, "title");
  if (title !== undefined) result.title = title;

  if (type === "flowchart") {
    result.direction = xmlAttribute(root, "direction");
    result.nodes = children(first(root, "nodes"), "node").map((node) => ({
      id: xmlAttribute(node, "id"),
      label: xmlAttribute(node, "label") ?? node.textContent.trim(),
      shape: xmlAttribute(node, "shape"),
    }));
    result.edges = children(first(root, "edges"), "edge").map((edge) => ({
      from: xmlAttribute(edge, "from"),
      to: xmlAttribute(edge, "to"),
      label: xmlAttribute(edge, "label"),
    }));
  } else if (type === "class") {
    result.classes = children(first(root, "classes"), "class").map((cls) => ({
      id: xmlAttribute(cls, "id"),
      attributes: children(cls, "attribute").map((item) => item.textContent.trim()),
      methods: children(cls, "method").map((item) => item.textContent.trim()),
    }));
    result.relations = children(first(root, "relations"), "relation").map((relation) => ({
      from: xmlAttribute(relation, "from"),
      to: xmlAttribute(relation, "to"),
      type: xmlAttribute(relation, "type"),
      label: xmlAttribute(relation, "label"),
    }));
  } else if (type === "sequence") {
    result.participants = children(first(root, "participants"), "participant").map((item) => ({
      id: xmlAttribute(item, "id"),
      label: xmlAttribute(item, "label"),
    }));
    result.messages = children(first(root, "messages"), "message").map((item) => ({
      from: xmlAttribute(item, "from"),
      to: xmlAttribute(item, "to"),
      type: xmlAttribute(item, "type"),
      text: xmlAttribute(item, "text") ?? item.textContent.trim(),
    }));
  }
  return result;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function attrs(values) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
    .join("");
}

export function toXmlDiagram(spec) {
  const opening = `<diagram${attrs({ type: spec.type, title: spec.title, direction: spec.direction })}>`;
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', opening];
  if (spec.type === "flowchart") {
    lines.push("  <nodes>");
    for (const node of spec.nodes) lines.push(`    <node${attrs(node)} />`);
    lines.push("  </nodes>", "  <edges>");
    for (const edge of spec.edges) lines.push(`    <edge${attrs(edge)} />`);
    lines.push("  </edges>");
  } else if (spec.type === "class") {
    lines.push("  <classes>");
    for (const cls of spec.classes) {
      lines.push(`    <class${attrs({ id: cls.id })}>`);
      for (const attribute of cls.attributes)
        lines.push(`      <attribute>${escapeXml(attribute)}</attribute>`);
      for (const method of cls.methods)
        lines.push(`      <method>${escapeXml(method)}</method>`);
      lines.push("    </class>");
    }
    lines.push("  </classes>", "  <relations>");
    for (const relation of spec.relations) lines.push(`    <relation${attrs(relation)} />`);
    lines.push("  </relations>");
  } else {
    lines.push("  <participants>");
    for (const item of spec.participants) lines.push(`    <participant${attrs(item)} />`);
    lines.push("  </participants>", "  <messages>");
    for (const item of spec.messages) lines.push(`    <message${attrs(item)} />`);
    lines.push("  </messages>");
  }
  lines.push("</diagram>");
  return lines.join("\n");
}
