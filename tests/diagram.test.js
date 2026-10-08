import test from "node:test";
import assert from "node:assert/strict";
import { DiagramError, parseDiagram, serializeDiagram, toMermaid, validateDiagram } from "../src/diagram.js";
import { EXAMPLES } from "../src/examples.js";

for (const [name, spec] of Object.entries(EXAMPLES)) {
  test(`${name} example compiles to Mermaid`, () => {
    const parsed = parseDiagram(JSON.stringify(spec));
    const output = toMermaid(parsed);
    assert.ok(output.includes({ flowchart: "flowchart LR", class: "classDiagram", sequence: "sequenceDiagram" }[name]));
    assert.ok(output.length > 30);
    assert.deepEqual(parseDiagram(serializeDiagram(spec)), validateDiagram(spec));
  });
}

test("invalid JSON produces a readable error", () => {
  assert.throws(() => parseDiagram("{invalid"), /JSON 문법 오류/);
});
test("unknown diagram type is rejected", () => {
  assert.throws(() => validateDiagram({ type: "state" }), /허용 값/);
});
test("missing edge endpoints are rejected", () => {
  assert.throws(() => validateDiagram({
    type: "flowchart",
    nodes: [{ id: "A", label: "A" }],
    edges: [{ from: "A", to: "B" }],
  }), /존재하지 않는 ID: B/);
});
test("duplicate IDs are rejected", () => {
  assert.throws(() => validateDiagram({
    type: "sequence",
    participants: [{ id: "A", label: "A" }, { id: "A", label: "B" }],
    messages: [{ from: "A", to: "A", text: "hello" }],
  }), /중복 ID/);
});
test("unsafe identifiers are rejected", () => {
  assert.throws(() => validateDiagram({
    type: "flowchart",
    nodes: [{ id: "A-->B", label: "oops" }],
  }), /영문자로 시작/);
});
test("labels are escaped in Mermaid output", () => {
  const code = toMermaid({
    type: "flowchart",
    nodes: [{ id: "A", label: '<script>alert("x")</script>' }, { id: "B", label: "Next" }],
    edges: [{ from: "A", to: "B", label: "ok|no" }],
  });
  assert.ok(code.includes("&lt;script&gt;"));
  assert.ok(code.includes("&quot;x&quot;"));
  assert.ok(code.includes("&#124;"));
  assert.ok(!code.includes("<script>"));
});
test("the editor applies source size limits", () => {
  assert.throws(() => parseDiagram("x".repeat(150_001)), /150KB/);
});
test("other serialization formats are rejected", () => {
  assert.throws(() => serializeDiagram(EXAMPLES.class, "yaml"), DiagramError);
});
