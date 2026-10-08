import { DiagramError, MAX_SOURCE_LENGTH, parseDiagram, serializeDiagram, toMermaid } from "./diagram.js";
import { EXAMPLES } from "./examples.js";

const $ = (id) => document.getElementById(id);
const editor = $("source-editor");
const mount = $("diagram-mount");
const placeholder = $("diagram-placeholder");
const formatButtons = Array.from(document.querySelectorAll("[data-format]"));
const exampleSelect = $("example-select");
const fileInput = $("file-input");
const dropZone = $("drop-zone");
const svgButton = $("download-svg-button");
const mermaidButton = $("copy-mermaid-button");

let currentFormat = "json";
let lastSpec = EXAMPLES.flowchart;
let drafts = {
  json: serializeDiagram(lastSpec, "json"),
  xml: serializeDiagram(lastSpec, "xml"),
};
let revision = 0;
let renderTimer;
let mermaidInstance;
let mermaidPromise;
let diagramSvg = "";
let renderSerial = 0;
let toastTimer;

function setStatus(text, state = "") {
  $("render-status-text").textContent = text;
  $("render-status").className = `render-status ${state}`;
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2300);
}

function updateLineCount() {
  const lines = editor.value.split("\n").length;
  $("line-count").textContent = `${lines} LINES · ${editor.value.length.toLocaleString()} CHARS`;
}

function updateFormatButtons() {
  for (const button of formatButtons) {
    const selected = button.dataset.format === currentFormat;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  $("source-filename").textContent = `diagram.${currentFormat}`;
  $("code-language").textContent = currentFormat.toUpperCase();
}

function updateMeta(spec) {
  const types = { flowchart: "FLOWCHART", class: "CLASS DIAGRAM", sequence: "SEQUENCE" };
  $("diagram-type").textContent = types[spec.type];
  $("diagram-title").textContent = spec.title || "제목 없음";
  const count = spec.type === "flowchart"
    ? `${spec.nodes.length} NODES · ${spec.edges.length} EDGES`
    : spec.type === "class"
      ? `${spec.classes.length} CLASSES · ${spec.relations.length} RELATIONS`
      : `${spec.participants.length} PARTICIPANTS · ${spec.messages.length} MESSAGES`;
  $("diagram-count").textContent = count;
}

function showPlaceholder(title, description) {
  mount.replaceChildren();
  diagramSvg = "";
  svgButton.disabled = true;
  placeholder.hidden = false;
  $("placeholder-title").textContent = title;
  $("placeholder-detail").textContent = description;
}

function getMermaid() {
  if (!mermaidPromise) {
    // Pinned release; the page runs without a build step, but rendering needs CDN access.
    mermaidPromise = import("https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs")
      .then((module) => {
        mermaidInstance = module.default;
        mermaidInstance.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          theme: "base",
          fontFamily: "Inter, Pretendard, sans-serif",
          themeVariables: {
            primaryColor: "#e1f4e9",
            primaryBorderColor: "#6b9d84",
            primaryTextColor: "#19342a",
            lineColor: "#4d7968",
            secondaryColor: "#eef4f1",
            tertiaryColor: "#f8fcfa",
            actorBkg: "#e1f4e9",
            actorBorder: "#6b9d84",
            actorTextColor: "#19342a",
            signalColor: "#426958",
            signalTextColor: "#19342a",
          },
          flowchart: { htmlLabels: false, curve: "basis" },
        });
        return mermaidInstance;
      }).catch((error) => {
        mermaidPromise = undefined; // let a later edit retry a transient network failure
        throw error;
      });
  }
  return mermaidPromise;
}

async function performRender(spec, code, requestId) {
  try {
    const mermaid = await getMermaid();
    if (requestId !== revision) return;
    const { svg } = await mermaid.render(`ai-uml-${++renderSerial}`, code);
    if (requestId !== revision) return;
    mount.innerHTML = svg; // Produced by Mermaid in strict security mode from validated data.
    diagramSvg = svg;
    placeholder.hidden = true;
    svgButton.disabled = false;
    setStatus("렌더링 완료");
  } catch (error) {
    if (requestId !== revision) return;
    console.error("Mermaid render failed:", error);
    showPlaceholder("다이어그램 렌더링 실패", "Mermaid를 불러오지 못했거나 변환 과정에서 오류가 발생했습니다. 네트워크 및 입력을 확인해 주세요.");
    setStatus("렌더링 실패 · 연결 또는 Mermaid 문법 확인", "error");
  }
}

function scheduleRender(delay = 300) {
  clearTimeout(renderTimer);
  const requestId = ++revision;
  updateLineCount();
  drafts[currentFormat] = editor.value;
  mermaidButton.disabled = true;
  svgButton.disabled = true;

  let spec;
  let code;
  try {
    spec = parseDiagram(editor.value, currentFormat);
    code = toMermaid(spec);
  } catch (error) {
    const message = error instanceof DiagramError || error instanceof Error ? error.message : "입력을 확인해 주세요.";
    showPlaceholder("입력을 확인해 주세요", message);
    $("mermaid-code").textContent = "";
    setStatus("검증 오류 · " + message, "error");
    return;
  }

  lastSpec = spec;
  drafts[currentFormat === "json" ? "xml" : "json"] = serializeDiagram(spec, currentFormat === "json" ? "xml" : "json");
  updateMeta(spec);
  $("mermaid-code").textContent = code;
  mermaidButton.disabled = false;
  setStatus("다이어그램 생성 중…", "pending");
  renderTimer = setTimeout(() => performRender(spec, code, requestId), delay);
}

function loadExample() {
  lastSpec = EXAMPLES[exampleSelect.value];
  drafts = {
    json: serializeDiagram(lastSpec, "json"),
    xml: serializeDiagram(lastSpec, "xml"),
  };
  editor.value = drafts[currentFormat];
  scheduleRender(0);
  toast("예제를 불러왔습니다.");
}

function changeFormat(next) {
  if (next === currentFormat) return;
  drafts[currentFormat] = editor.value;
  currentFormat = next;
  editor.value = drafts[next] ?? serializeDiagram(lastSpec, next);
  updateFormatButtons();
  scheduleRender(0);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMessage);
  } catch {
    toast("클립보드 복사 권한이 없습니다. HTTPS 또는 localhost에서 실행해 주세요.");
  }
}

function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function fileBase() {
  return (lastSpec.title || "ai-uml")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "ai-uml";
}

async function openFile(file) {
  if (!file) return;
  if (file.size > MAX_SOURCE_LENGTH * 4) {
    toast("파일이 너무 큽니다. 150KB 이하의 JSON/XML 파일을 선택해 주세요.");
    return;
  }
  try {
    const content = await file.text();
    if (content.length > MAX_SOURCE_LENGTH) {
      toast("입력은 150KB 이하로 제한됩니다.");
      return;
    }
    const fmt = file.name.toLowerCase().endsWith(".xml") || content.trimStart().startsWith("<") ? "xml" : "json";
    currentFormat = fmt;
    editor.value = content;
    updateFormatButtons();
    scheduleRender(0);
    toast(`${file.name} 파일을 불러왔습니다.`);
  } catch {
    toast("파일을 읽을 수 없습니다.");
  }
}

const AI_PROMPT = `시스템 설명을 바탕으로 UML 다이어그램 데이터를 JSON으로 작성해 줘.
설명 문장이나 마크다운 코드 펜스 없이, 유효한 JSON 객체만 출력해.
지원 타입 중 적합한 하나를 선택해:
1. flowchart: {"type":"flowchart","title":"제목","direction":"LR","nodes":[{"id":"start","label":"시작","shape":"round"},{"id":"end","label":"끝","shape":"rectangle"}],"edges":[{"from":"start","to":"end","label":"진행"}]}
2. class: {"type":"class","title":"제목","classes":[{"id":"User","attributes":["+id: string"],"methods":["+login(): bool"]}],"relations":[]}
3. sequence: {"type":"sequence","title":"제목","participants":[{"id":"client","label":"클라이언트"},{"id":"server","label":"서버"}],"messages":[{"from":"client","to":"server","text":"요청","type":"sync"}]}
모든 id는 영문자로 시작하고 영문/숫자/밑줄만 사용해. 참조하는 from/to는 반드시 존재하는 id여야 해.
shape: rectangle/round/diamond/circle/database
관계 종류: association/inheritance/composition/aggregation/dependency
메시지 종류: sync/async/return/dashed
JSON 키와 문자열에는 올바른 큰따옴표를 사용해.`;

formatButtons.forEach((button) => button.addEventListener("click", () => changeFormat(button.dataset.format)));
exampleSelect.addEventListener("change", loadExample);
$("reset-button").addEventListener("click", loadExample);
$("open-file-button").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => { openFile(fileInput.files?.[0]); fileInput.value = ""; });
editor.addEventListener("input", () => scheduleRender());
editor.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    scheduleRender(0);
  }
  if (event.key === "Tab") {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText("  ", start, end, "end");
    scheduleRender();
  }
});
$("download-source-button").addEventListener("click", () => {
  downloadBlob(editor.value, currentFormat === "json" ? "application/json;charset=utf-8" : "application/xml;charset=utf-8", `${fileBase()}.${currentFormat}`);
});
svgButton.addEventListener("click", () => {
  if (diagramSvg) downloadBlob(diagramSvg, "image/svg+xml;charset=utf-8", `${fileBase()}.svg`);
});
mermaidButton.addEventListener("click", () => copyText($("mermaid-code").textContent, "Mermaid 코드를 복사했습니다."));
$("copy-prompt-button").addEventListener("click", () => copyText(AI_PROMPT, "AI 프롬프트를 복사했습니다."));

let dragDepth = 0;
dropZone.addEventListener("dragenter", (event) => { event.preventDefault(); dragDepth++; dropZone.classList.add("drag-active"); });
dropZone.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; });
dropZone.addEventListener("dragleave", (event) => { event.preventDefault(); dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dropZone.classList.remove("drag-active"); });
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropZone.classList.remove("drag-active");
  openFile(event.dataTransfer.files?.[0]);
});

editor.value = drafts.json;
updateFormatButtons();
scheduleRender(0);
